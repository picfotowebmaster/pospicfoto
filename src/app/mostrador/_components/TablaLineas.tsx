"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import type { LineaPedidoDraft } from "@/lib/supabase/types";

interface TablaLineasProps {
  lineas: LineaPedidoDraft[];
  onEditar: (linea: LineaPedidoDraft) => void;
  onEliminar: (id: string) => void;
}

export function TablaLineas({ lineas, onEditar, onEliminar }: TablaLineasProps) {
  if (lineas.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-8">
        No hay productos agregados. Agrega una línea para comenzar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
            <th className="pb-2 pr-2">#</th>
            <th className="pb-2 pr-2">Producto</th>
            <th className="pb-2 pr-2">Detalles</th>
            <th className="pb-2 pr-2 text-center">Cant</th>
            <th className="pb-2 pr-2 text-right">P.U.</th>
            <th className="pb-2 text-right">Importe</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((linea, idx) => (
            <tr key={linea.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-2 text-gray-400">{idx + 1}</td>
              <td className="py-2 pr-2 font-medium">{linea.producto_nombre}</td>
              <td className="py-2 pr-2">
                {Object.entries(linea.atributos).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-block bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded mr-1 mb-1"
                  >
                    {k}: {v}
                  </span>
                ))}
              </td>
              <td className="py-2 pr-2 text-center">{linea.cantidad}</td>
              <td className="py-2 pr-2 text-right">${linea.precio_unitario.toFixed(2)}</td>
              <td className="py-2 text-right font-semibold">
                ${(linea.cantidad * linea.precio_unitario).toFixed(2)}
              </td>
              <td className="py-2 text-right">
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditar(linea)}
                  >
                    ✎
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEliminar(linea.id)}
                  >
                    ✕
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
