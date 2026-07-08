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
  "bg-yellow-500": { bg: "bg-yellow-50 dark:bg-yellow-900/30", text: "text-yellow-800 dark:text-yellow-300", border: "border-yellow-400 dark:border-yellow-700" },
  "bg-indigo-500": { bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-800 dark:text-indigo-300", border: "border-indigo-400 dark:border-indigo-700" },
  "bg-blue-500": { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", border: "border-blue-400 dark:border-blue-700" },
  "bg-teal-500": { bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-800 dark:text-teal-300", border: "border-teal-400 dark:border-teal-700" },
  "bg-emerald-500": { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-400 dark:border-emerald-700" },
  "bg-violet-500": { bg: "bg-violet-50 dark:bg-violet-900/30", text: "text-violet-800 dark:text-violet-300", border: "border-violet-400 dark:border-violet-700" },
  "bg-rose-500": { bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-800 dark:text-rose-300", border: "border-rose-400 dark:border-rose-700" },
  "bg-amber-500": { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", border: "border-amber-400 dark:border-amber-700" },
  "bg-green-500": { bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-800 dark:text-green-300", border: "border-green-400 dark:border-green-700" },
  "bg-gray-500": { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-800 dark:text-gray-300", border: "border-gray-400 dark:border-gray-600" },
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
      <div className="px-3 py-2 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
        <h3 className={`text-sm font-bold ${colores.text}`}>{area.nombre}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium bg-white/60 dark:bg-gray-800/60 rounded-full px-2 py-0.5">
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
          <div className="text-center text-gray-300 dark:text-gray-600 text-xs py-8 italic">
            Sin pedidos
          </div>
        )}
      </div>
    </div>
  );
}
