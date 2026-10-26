"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import type { AtributoValor } from "@/lib/supabase/types";
import type { ImportacionResumen } from "@/lib/services/importarPreciosWeb";
import {
  firmaValores,
  generarCombinaciones,
  normalizarValoresIds,
} from "@/lib/utils/precios";
import { construirCsvImportaciones } from "@/lib/utils/importarPrecios";
import { descargarCsv, slugArchivo } from "@/lib/utils/descargarCsv";
import {
  listarCatalogoAdmin,
  type CatalogoAdmin,
  type ProductoAdmin,
} from "../productos/actions";
import {
  aplicarImportacion,
  guardarPreciosProducto,
  obtenerPreciosProducto,
  previsualizarImportacion,
  type HistorialPrecioAdmin,
  type PrecioAdmin,
} from "./actions";
import { ModalImportarPrecios } from "./_components/ModalImportarPrecios";

interface AtributoProducto {
  id: string;
  nombre: string;
  valores: AtributoValor[];
  afecta_precio: boolean;
}

interface FilaPrecio {
  key: string;
  valores_ids: string[];
  etiqueta: string;
  precio: string;
}

function construirAtributosProducto(
  catalogo: CatalogoAdmin,
  producto: ProductoAdmin,
): AtributoProducto[] {
  return producto.atributos
    .map((pa) => {
      const atributo = catalogo.atributos.find((a) => a.id === pa.atributo_id);
      if (!atributo) return null;
      const valores = pa.valor_ids
        .map((id) => atributo.valores.find((v) => v.id === id))
        .filter((v): v is AtributoValor => Boolean(v));
      return {
        id: atributo.id,
        nombre: atributo.nombre,
        valores,
        afecta_precio: pa.afecta_precio,
      };
    })
    .filter((a): a is AtributoProducto => Boolean(a));
}

function construirFilas(
  atributos: AtributoProducto[],
  atributosPrecio: string[],
  precios: PrecioAdmin[],
): FilaPrecio[] {
  const seleccionados = new Set(atributosPrecio);
  const atributosDePrecio = atributos.filter((a) => seleccionados.has(a.id));
  const precioPorFirma = new Map(
    precios.map((p) => [firmaValores(p.valores_ids), p.precio]),
  );

  return generarCombinaciones(
    atributosDePrecio.map((a) => ({ nombre: a.nombre, valores: a.valores })),
  ).map((combinacion) => {
    const valoresIds = normalizarValoresIds(combinacion.map((v) => v.id));
    const firma = firmaValores(valoresIds);
    const precio = precioPorFirma.get(firma);
    return {
      key: firma || "base",
      valores_ids: valoresIds,
      etiqueta:
        combinacion.length > 0
          ? combinacion.map((v) => v.valor).join(" · ")
          : "Precio base",
      precio: precio !== undefined ? String(precio) : "",
    };
  });
}

function etiquetaValores(
  valoresIds: string[],
  valoresPorId: Map<string, string>,
): string {
  if (valoresIds.length === 0) return "Precio base";
  return valoresIds
    .map((id) => valoresPorId.get(id) ?? "Valor eliminado")
    .join(" · ");
}

function formatoMoneda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

function formatoFecha(valor: string): string {
  return new Date(valor).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function PreciosContent() {
  const { showError, showSuccess } = useToast();
  const searchParams = useSearchParams();
  const productoIdParam = searchParams.get("productoId");

  const [catalogo, setCatalogo] = useState<CatalogoAdmin | null>(null);
  const [categoriaSel, setCategoriaSel] = useState("");
  const [productoSel, setProductoSel] = useState("");
  const [atributos, setAtributos] = useState<AtributoProducto[]>([]);
  const [atributosPrecio, setAtributosPrecio] = useState<string[]>([]);
  const [precios, setPrecios] = useState<PrecioAdmin[]>([]);
  const [historial, setHistorial] = useState<HistorialPrecioAdmin[]>([]);
  const [filas, setFilas] = useState<FilaPrecio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [migracionPendiente, setMigracionPendiente] = useState(false);
  const [porcentaje, setPorcentaje] = useState("");
  const [productoInicialAplicado, setProductoInicialAplicado] =
    useState(false);
  const [filtro, setFiltro] = useState("");
  const [soloFaltantes, setSoloFaltantes] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importResumen, setImportResumen] =
    useState<ImportacionResumen | null>(null);
  const [importCargando, setImportCargando] = useState(false);
  const [importAplicando, setImportAplicando] = useState(false);
  const [importAplicado, setImportAplicado] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importReemplazar, setImportReemplazar] = useState(false);
  const [confirmarCategoria, setConfirmarCategoria] = useState(false);
  const [importandoCategoria, setImportandoCategoria] = useState(false);
  const [progresoCategoria, setProgresoCategoria] = useState({
    actual: 0,
    total: 0,
  });

  const productos = useMemo(
    () =>
      catalogo?.productos.filter((p) => p.categoria_id === categoriaSel) ?? [],
    [catalogo, categoriaSel],
  );

  const filasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return filas.filter((fila) => {
      if (soloFaltantes && fila.precio.trim() !== "") return false;
      if (q && !fila.etiqueta.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filas, filtro, soloFaltantes]);

  const cargaIdRef = useRef(0);

  const cargarProducto = useCallback(
    async (productoId: string, cat: CatalogoAdmin) => {
      const producto = cat.productos.find((p) => p.id === productoId);
      if (!producto) return;

      const cargaId = ++cargaIdRef.current;
      setCargando(true);
      try {
        const data = await obtenerPreciosProducto(productoId);
        if (cargaId !== cargaIdRef.current) return;
        setMigracionPendiente(false);
        const atributosProducto = construirAtributosProducto(cat, producto);
        let idsPrecio = atributosProducto
          .filter((a) => a.afecta_precio)
          .map((a) => a.id);

        if (idsPrecio.length === 0 && data.precios.length > 0) {
          const idPorValor = new Map<string, string>();
          for (const atributo of atributosProducto) {
            for (const valor of atributo.valores) {
              idPorValor.set(valor.id, atributo.id);
            }
          }
          const inferidos = new Set<string>();
          for (const precio of data.precios) {
            for (const valorId of precio.valores_ids ?? []) {
              const atributoId = idPorValor.get(valorId);
              if (atributoId) inferidos.add(atributoId);
            }
          }
          idsPrecio = [...inferidos];
          for (const atributo of atributosProducto) {
            atributo.afecta_precio = inferidos.has(atributo.id);
          }
        }

        setAtributos(atributosProducto);
        setAtributosPrecio(idsPrecio);
        setPrecios(data.precios);
        setHistorial(data.historial);
        setFilas(construirFilas(atributosProducto, idsPrecio, data.precios));
      } catch (err) {
        if (cargaId === cargaIdRef.current) {
          const mensaje =
            err instanceof Error ? err.message : "Error al cargar los precios";
          if (mensaje.includes("037_precios.sql")) {
            setMigracionPendiente(true);
          }
          showError(mensaje);
        }
      } finally {
        if (cargaId === cargaIdRef.current) setCargando(false);
      }
    },
    [showError],
  );

  useEffect(() => {
    listarCatalogoAdmin()
      .then((data) => {
        setCatalogo(data);
        const producto = productoIdParam
          ? data.productos.find((p) => p.id === productoIdParam)
          : null;
        if (producto) {
          setCategoriaSel(producto.categoria_id);
          setProductoSel(producto.id);
          void cargarProducto(producto.id, data);
        } else {
          setCategoriaSel(data.categorias[0]?.id ?? "");
        }
        setProductoInicialAplicado(true);
      })
      .catch((err) =>
        showError(
          err instanceof Error ? err.message : "Error al cargar el catálogo",
        ),
      );
  }, [productoIdParam, showError, cargarProducto]);

  function seleccionarCategoria(id: string) {
    cargaIdRef.current++;
    setCategoriaSel(id);
    setProductoSel("");
    setAtributos([]);
    setAtributosPrecio([]);
    setPrecios([]);
    setHistorial([]);
    setFilas([]);
    setCargando(false);
  }

  function seleccionarProducto(id: string) {
    cargaIdRef.current++;
    setProductoSel(id);
    setAtributos([]);
    setAtributosPrecio([]);
    setPrecios([]);
    setHistorial([]);
    setFilas([]);
    if (id && catalogo) void cargarProducto(id, catalogo);
  }

  function alternarAtributoPrecio(id: string, incluido: boolean) {
    const siguientes = incluido
      ? [...atributosPrecio, id]
      : atributosPrecio.filter((x) => x !== id);
    setAtributosPrecio(siguientes);
    setAtributos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, afecta_precio: incluido } : a)),
    );
    setFilas(construirFilas(atributos, siguientes, precios));
  }

  function actualizarPrecio(key: string, valor: string) {
    setFilas((prev) =>
      prev.map((fila) => (fila.key === key ? { ...fila, precio: valor } : fila)),
    );
  }

  function aplicarPorcentaje() {
    const valor = Number(porcentaje);
    if (!Number.isFinite(valor)) {
      showError("Ingresa un porcentaje válido");
      return;
    }
    const claves = new Set(filasFiltradas.map((fila) => fila.key));
    setFilas((prev) =>
      prev.map((fila) => {
        if (!claves.has(fila.key) || fila.precio.trim() === "") return fila;
        const nuevo = Number(fila.precio) * (1 + valor / 100);
        return { ...fila, precio: (Math.round(nuevo * 100) / 100).toFixed(2) };
      }),
    );
  }

  const valoresPorId = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const atributo of atributos) {
      for (const valor of atributo.valores) {
        mapa.set(valor.id, `${atributo.nombre}: ${valor.valor}`);
      }
    }
    return mapa;
  }, [atributos]);

  const preciosCapturados = filas.filter(
    (fila) => fila.precio.trim() !== "",
  ).length;
  const faltantes = filas.length - preciosCapturados;

  async function abrirImportacion() {
    if (!productoSel) return;
    setImportOpen(true);
    setImportCargando(true);
    setImportAplicando(false);
    setImportAplicado(false);
    setImportError(null);
    setImportResumen(null);
    setImportReemplazar(false);
    try {
      const resumen = await previsualizarImportacion(productoSel, atributosPrecio);
      setImportResumen(resumen);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Error al previsualizar la importación",
      );
    } finally {
      setImportCargando(false);
    }
  }

  async function confirmarImportacion() {
    if (!productoSel || importAplicando) return;
    setImportAplicando(true);
    setImportError(null);
    try {
      const { resumen, guardado } = await aplicarImportacion(productoSel, {
        reemplazar: importReemplazar,
        atributosPrecio,
      });
      setImportResumen(resumen);
      setImportAplicado(true);
      if (catalogo) await cargarProducto(productoSel, catalogo);
      showSuccess(
        `Importación lista: ${resumen.precios_importados} precios leídos, ${guardado.insertados} guardados y ${guardado.eliminados} eliminados.`,
      );
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Error al importar precios";
      setImportError(mensaje);
      if (mensaje.includes("037_precios.sql")) setMigracionPendiente(true);
    } finally {
      setImportAplicando(false);
    }
  }

  async function importarCategoria() {
    if (!catalogo || importandoCategoria) return;
    const lista = catalogo.productos.filter(
      (p) => p.categoria_id === categoriaSel,
    );
    if (lista.length === 0) return;

    setConfirmarCategoria(false);
    setImportandoCategoria(true);
    setProgresoCategoria({ actual: 0, total: lista.length });

    let importados = 0;
    let nuevos = 0;
    let actualizados = 0;
    let errores = 0;
    const logs: ImportacionResumen[] = [];

    for (let i = 0; i < lista.length; i++) {
      try {
        const { resumen } = await aplicarImportacion(lista[i].id, {
          reemplazar: false,
        });
        logs.push(resumen);
        importados += resumen.precios_importados;
        nuevos += resumen.nuevos;
        actualizados += resumen.actualizados;
      } catch {
        errores++;
      }
      setProgresoCategoria({ actual: i + 1, total: lista.length });
    }

    setImportandoCategoria(false);
    if (productoSel) await cargarProducto(productoSel, catalogo);

    if (logs.length > 0) {
      const categoriaNombre =
        catalogo.categorias.find((c) => c.id === categoriaSel)?.nombre ??
        "categoria";
      const csv = construirCsvImportaciones(
        logs.map((log) => ({
          producto: log.producto.nombre,
          detalle: log.detalle,
          conflictos: log.conflictos,
          faltantes: log.faltantes,
          incompletos: log.incompletos,
          sin_mapear: log.sin_mapear,
        })),
      );
      descargarCsv(
        `precios-${slugArchivo(categoriaNombre) || "categoria"}.csv`,
        csv,
      );
    }

    if (errores > 0) {
      showError(
        `Importación de la categoría terminada con ${errores} producto(s) con error.`,
      );
    }
    showSuccess(
      `Categoría importada: ${importados} precios leídos, ${nuevos} nuevos y ${actualizados} actualizados. Se descargó el log en CSV.`,
    );
  }

  async function guardar() {
    if (!productoSel || guardando) return;
    setGuardando(true);
    try {
      const filasGuardar = filas
        .filter((fila) => fila.precio.trim() !== "")
        .map((fila) => ({
          valores_ids: fila.valores_ids,
          precio: Number(fila.precio),
        }));

      await guardarPreciosProducto(productoSel, atributosPrecio, filasGuardar);
      const data = await obtenerPreciosProducto(productoSel);
      setPrecios(data.precios);
      setHistorial(data.historial);
      setAtributos((prev) =>
        prev.map((a) => ({
          ...a,
          afecta_precio: atributosPrecio.includes(a.id),
        })),
      );
      setCatalogo((prev) =>
        prev
          ? {
              ...prev,
              productos: prev.productos.map((p) =>
                p.id !== productoSel
                  ? p
                  : {
                      ...p,
                      atributos: p.atributos.map((a) => ({
                        ...a,
                        afecta_precio: atributosPrecio.includes(
                          a.atributo_id,
                        ),
                      })),
                    },
              ),
            }
          : prev,
      );
      setFilas(construirFilas(atributos, atributosPrecio, data.precios));
      showSuccess("Precios guardados");
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Error al guardar precios";
      if (mensaje.includes("037_precios.sql")) {
        setMigracionPendiente(true);
      }
      showError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  const producto =
    catalogo?.productos.find((p) => p.id === productoSel) ?? null;

  if (!catalogo || !productoInicialAplicado) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-sm text-gray-500">
        Cargando catálogo...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {migracionPendiente && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          <p className="font-semibold">Falta aplicar la migración de precios</p>
          <p className="mt-1 text-xs">
            Ejecuta <code className="font-mono">supabase/migrations/037_precios.sql</code>{" "}
            en el SQL Editor de Supabase. Después ejecuta{" "}
            <code className="font-mono">NOTIFY pgrst, &apos;reload schema&apos;;</code>{" "}
            o espera unos segundos y recarga esta página. Mientras tanto, el POS
            sigue funcionando con captura manual de precios.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase">
            Precios
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Elige un producto, marca qué atributos determinan el precio y
            captura cada variante.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Categoría
            </label>
            <select
              value={categoriaSel}
              onChange={(e) => seleccionarCategoria(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {catalogo.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Producto
            </label>
            <select
              value={productoSel}
              onChange={(e) => seleccionarProducto(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar producto...</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {productos.length} producto(s) en esta categoría
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmarCategoria(true)}
            disabled={importandoCategoria || productos.length === 0}
          >
            <i className="fas fa-cloud-download-alt mr-1.5" />
            Importar toda la categoría
          </Button>
        </div>

        {importandoCategoria && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <i className="fas fa-spinner fa-spin mr-1.5" />
            Importando {progresoCategoria.actual} de {progresoCategoria.total}...
          </div>
        )}
      </div>

      {!producto && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-8 text-center text-sm text-gray-400">
          Selecciona un producto para configurar sus precios.
        </div>
      )}

      {producto && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {producto.nombre}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {producto.atributos.length} atributo(s) ·{" "}
                  {atributosPrecio.length} de precio
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  <p>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {preciosCapturados}
                    </span>{" "}
                    de {filas.length} precios
                  </p>
                  {faltantes > 0 && (
                    <p className="text-amber-600 dark:text-amber-400">
                      {faltantes} sin precio
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={abrirImportacion}
                  disabled={importCargando || importAplicando}
                >
                  <i className="fas fa-cloud-download-alt mr-1.5" />
                  Importar desde tienda
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Atributos que determinan el precio
              </p>
              <div className="flex flex-wrap gap-2">
                {atributos.length === 0 && (
                  <span className="text-xs text-gray-400">
                    Este producto no tiene atributos configurados.
                  </span>
                )}
                {atributos.map((atributo) => {
                  const activo = atributosPrecio.includes(atributo.id);
                  return (
                    <label
                      key={atributo.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs cursor-pointer ${
                        activo
                          ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={activo}
                        onChange={(e) =>
                          alternarAtributoPrecio(atributo.id, e.target.checked)
                        }
                      />
                      {atributo.nombre}
                      <span className="text-[10px] opacity-70">
                        ({atributo.valores.length})
                      </span>
                    </label>
                  );
                })}
              </div>
              {atributosPrecio.some(
                (id) => (atributos.find((a) => a.id === id)?.valores.length ?? 0) === 0,
              ) && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Hay atributos de precio sin valores; agrega valores en
                  Productos antes de capturar precios.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Ajuste masivo (%)
                </label>
                <input
                  type="number"
                  step={0.01}
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  placeholder="Ej. 5"
                  className="w-28 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={aplicarPorcentaje}>
                Aplicar
              </Button>
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={guardar}
                disabled={guardando || filas.length === 0}
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Variantes
              </h3>
              <input
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar tamaño, páginas, hoja, diseño..."
                className="flex-1 min-w-52 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soloFaltantes}
                  onChange={(e) => setSoloFaltantes(e.target.checked)}
                />
                Solo faltantes
              </label>
              <span className="text-xs text-gray-400">
                {filasFiltradas.length} de {filas.length}
              </span>
            </div>
            {cargando ? (
              <p className="text-sm text-gray-400">Cargando precios...</p>
            ) : filas.length === 0 ? (
              <p className="text-sm text-gray-400">
                No hay variantes para los atributos seleccionados.
              </p>
            ) : filasFiltradas.length === 0 ? (
              <p className="text-sm text-gray-400">
                No hay variantes que coincidan con el filtro.
              </p>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-2">
                        Variante
                      </th>
                      <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-3 py-2 w-40">
                        Precio MXN
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasFiltradas.map((fila) => (
                      <tr
                        key={fila.key}
                        className="border-t border-gray-100 dark:border-gray-800"
                      >
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                          {fila.etiqueta}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={fila.precio}
                            onChange={(e) =>
                              actualizarPrecio(fila.key, e.target.value)
                            }
                            placeholder="Sin precio"
                            className="w-32 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-right bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <details className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-100">
              Historial de cambios ({historial.length})
            </summary>
            <div className="mt-3 space-y-2">
              {historial.length === 0 && (
                <p className="text-sm text-gray-400">Sin cambios registrados.</p>
              )}
              {historial.map((cambio) => {
                const tipo =
                  cambio.precio_anterior === null
                    ? "Alta"
                    : cambio.precio_nuevo === null
                      ? "Eliminación"
                      : "Actualización";
                return (
                  <div
                    key={cambio.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0"
                  >
                    <span
                      className={`font-medium px-2 py-0.5 rounded-full ${
                        tipo === "Alta"
                          ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : tipo === "Eliminación"
                            ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}
                    >
                      {tipo}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {etiquetaValores(cambio.valores_ids, valoresPorId)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatoMoneda(cambio.precio_anterior)} →{" "}
                      {formatoMoneda(cambio.precio_nuevo)}
                    </span>
                    <span className="text-gray-400 ml-auto">
                      {cambio.usuario_nombre ?? "Sistema"} ·{" "}
                      {formatoFecha(cambio.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        </>
      )}

      <ModalImportarPrecios
        open={importOpen}
        resumen={importResumen}
        cargando={importCargando}
        aplicando={importAplicando}
        error={importError}
        reemplazar={importReemplazar}
        onReemplazarChange={setImportReemplazar}
        aplicado={importAplicado}
        onCancel={() => {
          if (importAplicando) return;
          setImportOpen(false);
          setImportResumen(null);
          setImportError(null);
          setImportAplicado(false);
        }}
        onAplicar={confirmarImportacion}
      />

      <ConfirmModal
        open={confirmarCategoria}
        title="Importar toda la categoría"
        message={`Se importarán los precios de ${productos.length} producto(s) de la categoría seleccionada. Los conflictos y combinaciones sin precio se omitirán y quedarán para revisión manual.`}
        confirmLabel="Importar categoría"
        variant="warning"
        onConfirm={importarCategoria}
        onCancel={() => setConfirmarCategoria(false)}
      />
    </div>
  );
}

export default function PreciosPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-6 text-sm text-gray-500">
          Cargando precios...
        </div>
      }
    >
      <PreciosContent />
    </Suspense>
  );
}
