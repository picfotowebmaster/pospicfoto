"use client";

import React, { useMemo } from "react";
import { KanbanTarjeta } from "./KanbanTarjeta";
import type { Pedido } from "@/lib/supabase/types";
import type { NextAreaInfo } from "./KanbanBoard";

interface KanbanColumnaProps {
  area: { id: string; nombre: string; color: string; orden: number };
  pedidos: Pedido[];
  getNextForPedido: (pedido: Pedido) => NextAreaInfo[];
  onAvanzarPedido: (pedidoId: string, destino?: string) => Promise<void>;
  onCancelarPedido?: (pedidoId: string) => Promise<void>;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  "bg-yellow-500": { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-400" },
  "bg-indigo-500": { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-400" },
  "bg-blue-500": { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-400" },
  "bg-teal-500": { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-400" },
  "bg-emerald-500": { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-400" },
  "bg-violet-500": { bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-400" },
  "bg-rose-500": { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-400" },
  "bg-amber-500": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-400" },
  "bg-green-500": { bg: "bg-green-50", text: "text-green-800", border: "border-green-400" },
  "bg-gray-500": { bg: "bg-gray-50", text: "text-gray-800", border: "border-gray-400" },
};

export function KanbanColumna({
  area,
  pedidos,
  getNextForPedido,
  onAvanzarPedido,
  onCancelarPedido,
}: KanbanColumnaProps) {
  const colores = COLOR_MAP[area.color] || COLOR_MAP["bg-gray-500"];

  const ordenados = useMemo(() => {
    return [...pedidos].sort((a, b) => {
      const fa = `${a.fecha_entrega}T${a.hora_entrega}`;
      const fb = `${b.fecha_entrega}T${b.hora_entrega}`;
      return fa.localeCompare(fb);
    });
  }, [pedidos]);

  return (
    <div className={`flex-shrink-0 w-72 rounded-xl border ${colores.border} ${colores.bg} flex flex-col`}>
      <div className="px-3 py-2 border-b border-gray-200/50 flex items-center justify-between">
        <h3 className={`text-sm font-bold ${colores.text}`}>{area.nombre}</h3>
        <span className="text-xs text-gray-400 font-medium bg-white/60 rounded-full px-2 py-0.5">
          {pedidos.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-200px)]">
        {ordenados.map((pedido) => (
          <KanbanTarjeta
            key={pedido.id}
            pedido={pedido}
            nextAreas={getNextForPedido(pedido)}
            onAvanzarPedido={onAvanzarPedido}
            onCancelarPedido={onCancelarPedido}
          />
        ))}
        {pedidos.length === 0 && (
          <div className="text-center text-gray-300 text-xs py-8 italic">
            Sin pedidos
          </div>
        )}
      </div>
    </div>
  );
}
