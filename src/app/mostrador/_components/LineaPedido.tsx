"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Autocompletar } from "@/components/ui/Autocompletar";
import { useAutocompletar } from "@/lib/hooks/useAutocompletar";
import { buscarHistorial } from "@/lib/services/historial";
import { CampoAtributo } from "./CampoAtributo";
import type {
  Atributo,
  AtributoValor,
  ProductoHistorial,
} from "@/lib/supabase/types";
import type { LineaPedidoDraft } from "@/lib/supabase/types";
import { generarIdLocal } from "@/lib/utils/calculos";

interface LineaPedidoProps {
  id: string;
  atributosPool: (Atributo & { valores: AtributoValor[] })[];
  onSave: (linea: LineaPedidoDraft) => void;
  onCancel: () => void;
  editData?: LineaPedidoDraft;
}

export function LineaPedido({
  id,
  atributosPool,
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
  const [atributos, setAtributos] = useState<Record<string, string>>(
    editData?.atributos || {},
  );

  const autocompletar = useAutocompletar<ProductoHistorial>({
    fetchFn: buscarHistorial,
    onSelect: (item) => {
      setDescripcion(item.nombre);
      setAtributos(item.atributos || {});
    },
    renderItem: (h) => h.nombre,
    minChars: 2,
    idFromItem: (h) => h.id,
  });

  function handleSave() {
    onSave({
      id: id || generarIdLocal(),
      producto_nombre: descripcion,
      cantidad,
      precio_unitario: precioUnitario,
      atributos,
    });
  }

  const importeLinea = cantidad * precioUnitario;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-3">
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
