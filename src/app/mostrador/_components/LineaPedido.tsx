"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Autocompletar } from "@/components/ui/Autocompletar";
import { useAutocompletar } from "@/lib/hooks/useAutocompletar";
import { buscarHistorial } from "@/lib/services/historial";
import type { Catalogo } from "@/lib/services/catalogo";
import { CampoAtributo } from "./CampoAtributo";
import type {
  Atributo,
  AtributoValor,
  ProductoHistorial,
} from "@/lib/supabase/types";
import type { LineaPedidoDraft, RutaProduccion } from "@/lib/supabase/types";
import { generarIdLocal } from "@/lib/utils/calculos";
import { RUTAS_PRODUCCION } from "@/lib/utils/constantes";

function inferRuta(productoNombre: string): RutaProduccion {
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

export function LineaPedido({
  id,
  atributosPool,
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
  const [precioUnitario, setPrecioUnitario] = useState(
    editData?.precio_unitario || 0,
  );
  const [atributos, setAtributos] = useState<Record<string, string>>(
    editData?.atributos || {},
  );
  const [ruta, setRuta] = useState<RutaProduccion>(
    editData?.ruta || rutaDefault,
  );
  const [modoLibre, setModoLibre] = useState(!catalogo);
  const [categoriaId, setCategoriaId] = useState(editData?.categoria_id || "");
  const [productoId, setProductoId] = useState(editData?.producto_id || "");

  const autocompletar = useAutocompletar<ProductoHistorial>({
    fetchFn: buscarHistorial,
    onSelect: (item) => {
      setDescripcion(item.nombre);
      setAtributos(item.atributos || {});
      setRuta(inferRuta(item.nombre));
    },
    renderItem: (h) => h.nombre,
    minChars: 2,
    idFromItem: (h) => h.id,
  });

  const productosCategoria =
    catalogo?.productos.filter((p) => p.categoria_id === categoriaId) ?? [];
  const producto = catalogo?.productos.find((p) => p.id === productoId) ?? null;
  const atributosVisibles = modoLibre ? atributosPool : (producto?.atributos ?? []);

  function seleccionarCategoria(idCat: string) {
    setCategoriaId(idCat);
    setProductoId("");
    setAtributos({});
    setDescripcion("");
  }

  function seleccionarProducto(idProd: string) {
    setProductoId(idProd);
    const p = catalogo?.productos.find((x) => x.id === idProd);
    if (p) {
      setDescripcion(p.nombre);
      setRuta(p.ruta);
      setAtributos({});
    }
  }

  const puedeGuardar =
    descripcion.trim().length > 0 && (modoLibre || Boolean(productoId));

  function handleSave() {
    onSave({
      id: id || generarIdLocal(),
      producto_nombre: descripcion,
      cantidad,
      precio_unitario: precioUnitario,
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
                if (e.target.checked) {
                  setCategoriaId("");
                  setProductoId("");
                } else {
                  setAtributos({});
                }
              }}
            />
            Producto libre
          </label>
        </div>
      )}

      {catalogo && !modoLibre && (
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
      )}

      {modoLibre && (
        <div className="relative">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Producto *
          </label>
          <Autocompletar
            placeholder="Buscar producto..."
            valor={autocompletar.termino}
            onChange={autocompletar.buscar}
            opciones={autocompletar.opciones}
            renderOpcion={(h) => h.nombre}
            onSelect={autocompletar.seleccionar}
            abierto={autocompletar.abierto}
            cargando={autocompletar.cargando}
            indiceSeleccionado={autocompletar.indiceSeleccionado}
            onKeyDown={autocompletar.tecla}
            containerRef={autocompletar.containerRef}
            inputRef={autocompletar.inputRef}
            idFromItem={(h) => h.id}
          />
        </div>
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

      {atributosVisibles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {atributosVisibles.map((attr) => (
            <CampoAtributo
              key={attr.id}
              atributo={attr}
              valor={atributos[attr.nombre] || ""}
              valores={attr.valores}
              onChange={(val) =>
                setAtributos((prev) => ({ ...prev, [attr.nombre]: val }))
              }
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
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
            onChange={(e) =>
              setPrecioUnitario(Math.max(0, Number(e.target.value)))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Importe
          </label>
          <div className="w-full border border-gray-200 bg-gray-100 rounded-lg px-3 py-2 text-sm font-bold text-gray-700">
            ${importeLinea.toFixed(2)}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Ruta Prod.
          </label>
          <select
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
