"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Catalogo } from "@/lib/services/catalogo";
import { CampoAtributo } from "./CampoAtributo";
import type {
  Atributo,
  AtributoValor,
} from "@/lib/supabase/types";
import type { LineaPedidoDraft, RutaProduccion } from "@/lib/supabase/types";
import { generarIdLocal } from "@/lib/utils/calculos";
import { RUTAS_PRODUCCION } from "@/lib/utils/constantes";
import { resolverPrecio } from "@/lib/utils/precios";

export function inferRuta(productoNombre: string): RutaProduccion {
  const lower = productoNombre.toLowerCase();
  if (/marco|moldura|enmarc|frame/i.test(lower)) return "R2";
  if (/book|album|fotolibro|photobook/i.test(lower)) return "R3";
  if (/lamin|plastif/i.test(lower)) return "R4";
  return "R1";
}

interface LineaPedidoProps {
  id: string;
  atributosPool: (Atributo & { valores: AtributoValor[] })[];
  onSave: (linea: LineaPedidoDraft) => void;
  onCancel: () => void;
  editData?: LineaPedidoDraft;
  rutaDefault: RutaProduccion;
  catalogo?: Catalogo;
}

const ETIQUETA_PASO =
  "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";

export function LineaPedido({
  id,
  onSave,
  onCancel,
  editData,
  rutaDefault,
  catalogo,
}: LineaPedidoProps) {
  const [descripcion, setDescripcion] = useState(
    editData?.producto_nombre || "",
  );
  const [cantidad, setCantidad] = useState(editData?.cantidad || 1);
  const productoInicial =
    catalogo?.productos.find((p) => p.id === (editData?.producto_id || "")) ??
    null;
  const precioListaInicial =
    editData?.precio_lista ??
    (productoInicial
      ? resolverPrecio(productoInicial, editData?.atributos || {}).precio
      : null);

  const [precioUnitario, setPrecioUnitario] = useState(
    editData?.precio_unitario || 0,
  );
  const [precioLista, setPrecioLista] = useState<number | null>(
    precioListaInicial,
  );
  const [precioManual, setPrecioManual] = useState(
    Boolean(
      editData &&
        precioListaInicial !== null &&
        editData.precio_unitario !== precioListaInicial,
    ),
  );
  const [atributos, setAtributos] = useState<Record<string, string>>(
    editData?.atributos || {},
  );
  const [ruta, setRuta] = useState<RutaProduccion>(
    editData?.ruta || rutaDefault,
  );
  const [modoLibre, setModoLibre] = useState(
    editData ? !editData.producto_id && !editData.categoria_id : !catalogo,
  );
  const [categoriaId, setCategoriaId] = useState(editData?.categoria_id || "");
  const [productoId, setProductoId] = useState(editData?.producto_id || "");

  const productosCategoria =
    catalogo?.productos.filter((p) => p.categoria_id === categoriaId) ?? [];
  const producto = catalogo?.productos.find((p) => p.id === productoId) ?? null;
  const atributosVisibles = producto?.atributos ?? [];

  function seleccionarCategoria(idCat: string) {
    setCategoriaId(idCat);
    setProductoId("");
    setAtributos({});
    setDescripcion("");
    setPrecioLista(null);
    setPrecioManual(false);
    setPrecioUnitario(0);
  }

  function seleccionarProducto(idProd: string) {
    setProductoId(idProd);
    const p = catalogo?.productos.find((x) => x.id === idProd);
    if (p) {
      setDescripcion(p.nombre);
      setRuta(p.ruta);
      setAtributos({});
      const resultado = resolverPrecio(p, {});
      setPrecioLista(resultado.precio);
      setPrecioManual(false);
      setPrecioUnitario(resultado.precio ?? 0);
    }
  }

  function actualizarAtributo(nombre: string, valor: string) {
    const siguientes = { ...atributos, [nombre]: valor };
    setAtributos(siguientes);

    if (!producto) return;
    const esPrecio = producto.atributos.some(
      (attr) => attr.nombre === nombre && attr.afecta_precio,
    );
    const resultado = resolverPrecio(producto, siguientes);
    setPrecioLista(resultado.precio);

    if (esPrecio) {
      setPrecioManual(false);
      setPrecioUnitario(resultado.precio ?? 0);
    }
  }

  const atributosCompletos =
    modoLibre ||
    atributosVisibles.every(
      (attr) => (atributos[attr.nombre] || "").trim() !== "",
    );

  const tienePrecioDeLista = Boolean(
    producto &&
      (producto.atributos.some((attr) => attr.afecta_precio) ||
        producto.precios.length > 0),
  );

  const puedeGuardar =
    descripcion.trim().length > 0 &&
    (modoLibre || Boolean(productoId)) &&
    atributosCompletos &&
    precioUnitario > 0;

  function handleSave() {
    onSave({
      id: id || generarIdLocal(),
      producto_nombre: descripcion,
      cantidad,
      precio_unitario: precioUnitario,
      precio_lista: precioLista,
      atributos,
      ruta,
      categoria_id: modoLibre ? null : categoriaId || null,
      producto_id: modoLibre ? null : productoId || null,
    });
  }

  const importeLinea = cantidad * precioUnitario;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-3">
      {catalogo && (
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={modoLibre}
              onChange={(e) => {
                setModoLibre(e.target.checked);
                setPrecioLista(null);
                setPrecioManual(false);
                setPrecioUnitario(0);
                setAtributos({});
                if (e.target.checked) {
                  setCategoriaId("");
                  setProductoId("");
                }
              }}
            />
            Producto libre
          </label>
        </div>
      )}

      {catalogo && !modoLibre && (
        <>
          <span className={ETIQUETA_PASO}>1. Categoría y producto</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Categoría *
              </label>
              <select
                value={categoriaId}
                onChange={(e) => seleccionarCategoria(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar categoría...</option>
                {catalogo.categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Producto *
              </label>
              <select
                value={productoId}
                onChange={(e) => seleccionarProducto(e.target.value)}
                disabled={!categoriaId}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Seleccionar producto...</option>
                {productosCategoria.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Descripción *
        </label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nombre del producto o servicio..."
        />
      </div>

      {!modoLibre && atributosVisibles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={ETIQUETA_PASO}>2. Opciones del producto</span>
            {!atributosCompletos && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Selecciona todas las opciones
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {atributosVisibles.map((attr) => (
              <CampoAtributo
                key={attr.id}
                atributo={attr}
                valor={atributos[attr.nombre] || ""}
                valores={attr.valores}
                variante="select"
                onChange={(val) => actualizarAtributo(attr.nombre, val)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <span className={ETIQUETA_PASO}>
          {modoLibre ? "Precio y ruta" : "3. Precio y ruta"}
        </span>
        <div
          className={`grid gap-3 ${modoLibre ? "grid-cols-3" : "grid-cols-4"}`}
        >
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Cantidad *
            </label>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Precio Unitario *
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={precioUnitario || ""}
              onChange={(e) => {
                setPrecioManual(true);
                setPrecioUnitario(Math.max(0, Number(e.target.value)));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {!modoLibre && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Importe
              </label>
              <div className="w-full border border-gray-200 bg-gray-100 rounded-lg px-3 py-2 text-sm font-bold text-gray-700">
                ${importeLinea.toFixed(2)}
              </div>
            </div>
          )}
          {(!catalogo || modoLibre || productoId) && (
            <div>
              <label htmlFor="linea-ruta-produccion" className="block text-xs font-medium text-gray-500 mb-1">
              Ruta Prod.
              </label>
              <select
                id="linea-ruta-produccion"
                value={ruta}
                onChange={(e) => setRuta(e.target.value as RutaProduccion)}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {RUTAS_PRODUCCION.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!modoLibre && producto && tienePrecioDeLista && (
          <div className="text-xs">
            {!atributosCompletos ? (
              <span className="text-gray-500 dark:text-gray-400">
                Selecciona todas las opciones para calcular el precio.
              </span>
            ) : precioLista === null ? (
              <span className="text-amber-600 dark:text-amber-400">
                Sin precio configurado para esta variante. Captura el precio
                manualmente.
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">
                  Precio de lista:{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    ${precioLista.toFixed(2)}
                  </span>
                </span>
                {precioManual && precioUnitario !== precioLista && (
                  <>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Precio modificado
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPrecioUnitario(precioLista);
                        setPrecioManual(false);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Usar precio de lista
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!modoLibre && producto && !tienePrecioDeLista && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Este producto no tiene precio de lista configurado.
          </span>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!puedeGuardar}>
          {editData ? "Actualizar Línea" : "Agregar Línea"}
        </Button>
      </div>
    </div>
  );
}
