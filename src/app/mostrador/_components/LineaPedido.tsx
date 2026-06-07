"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
// import { Autocompletar } from "@/components/ui/Autocompletar";
// import { CampoAtributo } from "./CampoAtributo";
// import type {
//   Atributo,
//   AtributoValor,
//   ProductoHistorial,
// } from "@/lib/supabase/types";
import type { LineaPedidoDraft } from "@/lib/supabase/types";
import { generarIdLocal } from "@/lib/utils/calculos";

interface LineaPedidoProps {
  id: string;
  // atributosPool: (Atributo & { valores: AtributoValor[] })[];
  onSave: (linea: LineaPedidoDraft) => void;
  onCancel: () => void;
  editData?: LineaPedidoDraft;
}

export function LineaPedido({
  id,
  // atributosPool,
  onSave,
  onCancel,
  editData,
}: LineaPedidoProps) {
  const [descripcion, setDescripcion] = useState(
    editData?.producto_nombre || "",
  );
  const [cantidad, setCantidad] = useState(editData?.cantidad || 1);
  const [precioUnitario, setPrecioUnitario] = useState(
    editData?.precio_unitario || 0,
  );
  // const [atributos, setAtributos] = useState<Record<string, string>>(
  //   editData?.atributos || {},
  // );
  // const [sugerencias, setSugerencias] = useState<ProductoHistorial[]>([]);
  // const [abierto, setAbierto] = useState(false);
  // const [cargandoHistorial, setCargandoHistorial] = useState(false);
  // const containerRef = React.useRef<HTMLDivElement>(null);
  // const inputRef = React.useRef<HTMLInputElement>(null);

  // async function buscarProductoNombre(termino: string) {
  //   setProductoNombre(termino);
  //   if (termino.length < 2) {
  //     setSugerencias([]);
  //     setAbierto(false);
  //     return;
  //   }
  //   setCargandoHistorial(true);
  //   try {
  //     const { buscarHistorial } = await import("@/lib/services/historial");
  //     const res = await buscarHistorial(termino);
  //     setSugerencias(res);
  //     setAbierto(res.length > 0);
  //   } catch {
  //     setSugerencias([]);
  //   } finally {
  //     setCargandoHistorial(false);
  //   }
  // }

  // function seleccionarHistorial(item: ProductoHistorial) {
  //   setProductoNombre(item.nombre);
  //   setAtributos(item.atributos || {});
  //   setAbierto(false);
  // }

  function handleSave() {
    onSave({
      id: id || generarIdLocal(),
      producto_nombre: descripcion,
      cantidad,
      precio_unitario: precioUnitario,
      atributos: {},
    });
  }

  const importeLinea = cantidad * precioUnitario;

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-3">
      {/* ===== SECCIÓN PRODUCTO/AUTOCOMPLETE (COMENTADA) =====
      <div ref={containerRef} className="relative">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Producto *
        </label>
        <Autocompletar
          placeholder="Nombre del producto..."
          valor={productoNombre}
          onChange={buscarProductoNombre}
          opciones={sugerencias}
          renderOpcion={(h) => h.nombre}
          onSelect={seleccionarHistorial}
          abierto={abierto}
          cargando={cargandoHistorial}
          indiceSeleccionado={-1}
          onKeyDown={() => {}}
          containerRef={containerRef}
          inputRef={inputRef}
          idFromItem={(h) => h.id}
        />
      </div>
      ===== FIN SECCIÓN AUTOCOMPLETE ===== */}

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

      {/* ===== SECCIÓN ATRIBUTOS (COMENTADA) =====
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {atributosPool.map((attr) => (
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
      ===== FIN SECCIÓN ATRIBUTOS ===== */}

      <div className="grid grid-cols-3 gap-3">
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
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave}>
          {editData ? "Actualizar Línea" : "Agregar Línea"}
        </Button>
      </div>
    </div>
  );
}
