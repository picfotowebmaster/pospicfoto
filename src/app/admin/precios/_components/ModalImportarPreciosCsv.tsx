"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { descargarCsv, slugArchivo } from "@/lib/utils/descargarCsv";
import {
  construirLogPreciosCsv,
  type PrevisualizacionPreciosCsv,
} from "@/lib/utils/preciosCsv";
import {
  aplicarPreciosCsv,
  previsualizarPreciosCsv,
} from "../actions";

interface ModalImportarPreciosCsvProps {
  open: boolean;
  categoriaId: string;
  categoriaNombre: string;
  onClose: () => void;
  onApplied: () => void;
}

const formatoMoneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

const ESTADOS: Record<string, string> = {
  nuevo: "Nuevo",
  actualizado: "Actualizado",
  sin_cambios: "Sin cambio",
};

function money(valor: number | null): string {
  if (valor === null) return "—";
  return formatoMoneda.format(valor);
}

export function ModalImportarPreciosCsv({
  open,
  categoriaId,
  categoriaNombre,
  onClose,
  onApplied,
}: ModalImportarPreciosCsvProps) {
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [contenido, setContenido] = useState("");
  const [preview, setPreview] = useState<PrevisualizacionPreciosCsv | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crearFaltantes, setCrearFaltantes] = useState(false);
  const [resultado, setResultado] = useState<{
    productos: number;
    productos_creados: number;
    colores_creados: number;
    precios_creados: number;
    cambios: number;
    insertados: number;
    eliminados: number;
    errores: { producto: string; mensaje: string }[];
  } | null>(null);
  const categoriaPermiteCrear =
    categoriaNombre.trim().toLowerCase() === "marcos";

  const puedeAplicar = useMemo(() => {
    if (!preview || cargando || aplicando || preview.errores.length > 0) {
      return false;
    }
    return preview.resumen.actualizadas + preview.resumen.nuevas > 0;
  }, [preview, cargando, aplicando]);

  if (!open) return null;

  async function cargarPreview(texto: string, crear: boolean) {
    setCargando(true);
    setError(null);

    try {
      const data = await previsualizarPreciosCsv(categoriaId, texto, {
        crearProductosFaltantes: crear,
      });
      setPreview(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer el archivo.",
      );
      setPreview(null);
    } finally {
      setCargando(false);
    }
  }

  async function seleccionarArchivo(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;

    if (!archivo.name.toLowerCase().endsWith(".csv")) {
      setError("Selecciona un archivo con extensión .csv.");
      return;
    }

    if (archivo.size > 1_000_000) {
      setError("El archivo supera 1 MB. Divide la importación en partes.");
      return;
    }

    setNombreArchivo(archivo.name);
    setPreview(null);
    setResultado(null);
    setError(null);

    try {
      const texto = await archivo.text();
      setContenido(texto);
      await cargarPreview(texto, crearFaltantes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer el archivo.",
      );
      setContenido("");
    }
  }

  async function alternarCrearFaltantes(valor: boolean) {
    setCrearFaltantes(valor);
    setResultado(null);
    if (contenido) {
      await cargarPreview(contenido, valor);
    }
  }

  async function aplicar() {
    if (!contenido || !puedeAplicar) return;

    setAplicando(true);
    setError(null);

    try {
      const data = await aplicarPreciosCsv(categoriaId, contenido, {
        crearProductosFaltantes: crearFaltantes,
      });
      setResultado(data);
      onApplied();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron aplicar los precios.",
      );
    } finally {
      setAplicando(false);
    }
  }

  function descargarLog() {
    if (!preview) return;
    descargarCsv(
      `log-precios-${slugArchivo(categoriaNombre) || "categoria"}.csv`,
      "\uFEFF" + construirLogPreciosCsv(preview),
    );
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={() => {
          if (!aplicando) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="importar-precios-csv-title"
        className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 space-y-4"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
          <div>
            <h2
              id="importar-precios-csv-title"
              className="text-lg font-bold text-gray-900 dark:text-gray-100"
            >
              Importar precios por CSV
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {categoriaNombre} · Precio vacío = sin cambio
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={aplicando}
          >
            <i className="fas fa-times" />
          </Button>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200 space-y-1">
          <p>
            1. Usa la plantilla CSV o abre el archivo que ya tienes en Excel.
          </p>
          <p>
            2. Captura <strong>Precio nuevo</strong>. No cambies los nombres de
            las columnas.
          </p>
          <p>
            3. Guarda como CSV UTF-8 manteniendo el delimitador punto y coma
            (;), y súbelo aquí.
          </p>
          <p className="opacity-80">
            La columna Color marco es informativa: el precio se define por
            tamaño, no por color.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer">
            <i className="fas fa-file-upload" />
            Seleccionar archivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={seleccionarArchivo}
              disabled={cargando || aplicando}
            />
          </label>
          {nombreArchivo && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {nombreArchivo}
            </span>
          )}
          {cargando && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <i className="fas fa-spinner fa-spin mr-1.5" />
              Validando archivo...
            </span>
          )}
        </div>

        {categoriaPermiteCrear && (
          <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={crearFaltantes}
              onChange={(event) => void alternarCrearFaltantes(event.target.checked)}
              disabled={cargando || aplicando}
              className="mt-0.5"
            />
            <span>
              <strong>Crear productos que no existan</strong>
              <span className="block opacity-80">
                Solo para Marcos. Crea la moldura con ruta R2, liga tamaños y
                colores, y carga sus precios iniciales.
              </span>
            </span>
          </label>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {resultado && (
          <div
            className={
              resultado.errores.length > 0
                ? "rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                : "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200"
            }
          >
            <p className="font-semibold">
              {resultado.errores.length > 0
                ? "Importación parcial"
                : "Importación aplicada"}
            </p>
            <p className="text-xs mt-1">
              {resultado.productos} producto(s) existente(s),{" "}
              {resultado.cambios} cambio(s), {resultado.insertados} precio(s)
              guardado(s).
            </p>
            {resultado.productos_creados > 0 && (
              <p className="text-xs mt-1 font-medium">
                Se crearon {resultado.productos_creados} producto(s),{" "}
                {resultado.colores_creados} color(es) y{" "}
                {resultado.precios_creados} precio(s) iniciales.
              </p>
            )}
            {resultado.errores.length > 0 && (
              <>
                <p className="text-xs mt-1 font-medium">
                  Revisa los errores; la importación no se completó por
                  completo.
                </p>
                <ul className="list-disc pl-4 text-xs mt-1">
                  {resultado.errores.map((item) => (
                    <li key={item.producto}>
                      {item.producto}: {item.mensaje}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={descargarLog}>
              <i className="fas fa-download mr-1.5" />
              Descargar log CSV
            </Button>
          </div>
        )}

        {preview && !resultado && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              {[
                ["Filas", preview.resumen.total_filas],
                ["Válidas", preview.resumen.validas],
                ["Actualizadas", preview.resumen.actualizadas],
                ["Nuevas", preview.resumen.nuevas],
                ["Productos nuevos", preview.resumen.productos_nuevos],
                ["Colores nuevos", preview.resumen.colores_nuevos],
                ["Precios nuevos", preview.resumen.precios_nuevos],
                ["Errores", preview.resumen.errores],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {crearFaltantes && preview.productos_nuevos.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Se crearán {preview.productos_nuevos.length} producto(s) nuevo(s)
                </p>
                {preview.colores_nuevos.length > 0 && (
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    Colores nuevos en el catálogo:{" "}
                    {preview.colores_nuevos.join(", ")}
                  </p>
                )}
                <div className="mt-2 overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-amber-900 dark:text-amber-200">
                        <th className="py-1 pr-3 font-medium">Producto</th>
                        <th className="py-1 pr-3 font-medium">Colores</th>
                        <th className="py-1 pr-3 font-medium">Precios</th>
                        <th className="py-1 font-medium">Rango</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.productos_nuevos.map((producto) => (
                        <tr
                          key={producto.nombre}
                          className="border-t border-amber-200/60 dark:border-amber-800/60"
                        >
                          <td className="py-1 pr-3 text-amber-900 dark:text-amber-200">
                            {producto.nombre}
                          </td>
                          <td className="py-1 pr-3 text-amber-800 dark:text-amber-300">
                            {producto.colores.length}
                          </td>
                          <td className="py-1 pr-3 text-amber-800 dark:text-amber-300">
                            {producto.precios.length}
                          </td>
                          <td className="py-1 text-amber-800 dark:text-amber-300">
                            {money(producto.precio_min)} -{" "}
                            {money(producto.precio_max)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.errores.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Corrige estos errores antes de aplicar
                </p>
                <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-red-800 dark:text-red-300 space-y-0.5">
                  {preview.errores.map((item, index) => (
                    <li key={`${item.fila}-${index}`}>
                      {item.fila > 0 ? `Fila ${item.fila}: ` : ""}
                      {item.mensaje}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5">
                        Fila
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5">
                        Producto
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5">
                        Variante
                      </th>
                      <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5">
                        Actual
                      </th>
                      <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5">
                        Nuevo
                      </th>
                      <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.filas.map((fila) => (
                      <tr
                        key={`${fila.producto_id}-${fila.valores_ids.join("|")}`}
                        className="border-t border-gray-100 dark:border-gray-800"
                      >
                        <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                          {fila.fila}
                        </td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                          {fila.producto_nombre}
                        </td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                          {fila.etiqueta}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-600 dark:text-gray-400">
                          {money(fila.precio_actual)}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-800 dark:text-gray-200">
                          {money(fila.precio_nuevo)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              fila.estado === "nuevo"
                                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : fila.estado === "actualizado"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {ESTADOS[fila.estado] ?? fila.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
              <p className="mr-auto text-xs text-gray-500 dark:text-gray-400">
                Se actualizarán {preview.resumen.actualizadas} precio(s), se
                crearán {preview.resumen.precios_nuevos} precio(s) iniciales y{" "}
                {preview.resumen.productos_nuevos} producto(s).
              </p>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={aplicando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={aplicar} disabled={!puedeAplicar}>
                {aplicando ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-1.5" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-1.5" />
                    {crearFaltantes ? "Crear y aplicar" : "Aplicar precios"}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
