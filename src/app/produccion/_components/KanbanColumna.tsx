"use client";

import React, { useMemo, useState, type DragEvent } from "react";
import { KanbanTarjeta } from "./KanbanTarjeta";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Pedido } from "@/lib/supabase/types";
import type { NextAreaInfo } from "./KanbanBoard";

interface KanbanColumnaProps {
  area: { id: string; nombre: string; color: string; orden: number };
  pedidos: Pedido[];
  getNextForPedido: (pedido: Pedido) => NextAreaInfo[];
  onAvanzarPedido: (pedidoId: string, destino?: string) => Promise<void>;
  onCancelarPedido?: (pedidoId: string) => Promise<void>;
  onRegresarPedido?: (pedidoId: string) => Promise<void>;
  getTiempoEnColumna?: (pedidoId: string) => string | null;
  modoSeleccion?: boolean;
  selectedIds?: Set<string>;
  onToggleSeleccion?: (id: string) => void;
  onActivarSeleccion?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  wipLimit?: number;
  onClickDetalle?: (pedido: Pedido) => void;
  columnRef?: (el: HTMLDivElement | null) => void;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "bg-yellow-500": { bg: "bg-yellow-50 dark:bg-yellow-900/30", text: "text-yellow-800 dark:text-yellow-300", border: "border-yellow-400 dark:border-yellow-700", dot: "bg-yellow-500" },
  "bg-indigo-500": { bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-800 dark:text-indigo-300", border: "border-indigo-400 dark:border-indigo-700", dot: "bg-indigo-500" },
  "bg-blue-500": { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", border: "border-blue-400 dark:border-blue-700", dot: "bg-blue-500" },
  "bg-teal-500": { bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-800 dark:text-teal-300", border: "border-teal-400 dark:border-teal-700", dot: "bg-teal-500" },
  "bg-emerald-500": { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-400 dark:border-emerald-700", dot: "bg-emerald-500" },
  "bg-violet-500": { bg: "bg-violet-50 dark:bg-violet-900/30", text: "text-violet-800 dark:text-violet-300", border: "border-violet-400 dark:border-violet-700", dot: "bg-violet-500" },
  "bg-rose-500": { bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-800 dark:text-rose-300", border: "border-rose-400 dark:border-rose-700", dot: "bg-rose-500" },
  "bg-amber-500": { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", border: "border-amber-400 dark:border-amber-700", dot: "bg-amber-500" },
  "bg-green-500": { bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-800 dark:text-green-300", border: "border-green-400 dark:border-green-700", dot: "bg-green-500" },
  "bg-gray-500": { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-800 dark:text-gray-300", border: "border-gray-400 dark:border-gray-600", dot: "bg-gray-500" },
};

export function KanbanColumna({
  area,
  pedidos,
  getNextForPedido,
  onAvanzarPedido,
  onCancelarPedido,
  onRegresarPedido,
  getTiempoEnColumna,
  modoSeleccion,
  selectedIds,
  onToggleSeleccion,
  onActivarSeleccion,
  isCollapsed,
  onToggleCollapse,
  wipLimit,
  onClickDetalle,
  columnRef,
}: KanbanColumnaProps) {
  const colores = COLOR_MAP[area.color] || COLOR_MAP["bg-gray-500"];
  const [dragOver, setDragOver] = useState(false);

  const ordenados = useMemo(() => {
    return [...pedidos].sort((a, b) => {
      const fa = `${a.fecha_entrega}T${a.hora_entrega}`;
      const fb = `${b.fecha_entrega}T${b.hora_entrega}`;
      return fa.localeCompare(fb);
    });
  }, [pedidos]);

  const count = pedidos.length;
  const isOverWip = wipLimit && count > wipLimit;

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData("text/plain");
      if (!raw) return;
      const { pedidoId, hasMultiple } = JSON.parse(raw);
      if (!pedidoId) return;
      const pedido = pedidos.find((p) => p.id === pedidoId);
      if (pedido) return;
      if (hasMultiple) {
        await onAvanzarPedido(pedidoId, area.id);
      } else {
        await onAvanzarPedido(pedidoId);
      }
    } catch {
      /* datos inválidos, ignorar */
    }
  }

  return (
    <div
      ref={(el) => { if (columnRef) columnRef(el); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-shrink-0 w-72 rounded-xl border ${colores.border} ${colores.bg} flex flex-col transition-all duration-200 kanban-columna ${dragOver ? "ring-2 ring-blue-400 dark:ring-blue-500 shadow-lg scale-[1.02]" : ""}`}
    >
      <div className="px-3 py-2 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colores.dot}`} />
          <h3 className={`text-sm font-bold ${colores.text} truncate`}>{area.nombre}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {onActivarSeleccion && pedidos.length > 0 && (
            <Tooltip content="Seleccionar pedidos para avanzar en lote">
              <button
                type="button"
                onClick={onActivarSeleccion}
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer p-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <i className="fas fa-check-square" />
              </button>
            </Tooltip>
          )}
          {onToggleCollapse && (
            <Tooltip content={isCollapsed ? "Expandir columna" : "Colapsar columna"}>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer p-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <i className={`fas fa-chevron-${isCollapsed ? "right" : "up"}`} />
              </button>
            </Tooltip>
          )}
          <span className={`text-xs font-medium rounded-full px-2 py-0.5 transition-colors ${
            isOverWip
              ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 animate-[wip-pulse_2s_ease-in-out_infinite]"
              : "bg-white/60 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500"
          }`}>
            {count}{wipLimit ? `/${wipLimit}` : ""}
          </span>
        </div>
      </div>

      {wipLimit && (
        <div className="px-3 pt-1.5">
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOverWip ? "bg-red-500" : count > wipLimit * 0.8 ? "bg-yellow-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, (count / wipLimit) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-200px)]">
          {ordenados.map((pedido) => (
            <KanbanTarjeta
              key={pedido.id}
              pedido={pedido}
              nextAreas={getNextForPedido(pedido)}
              onAvanzarPedido={onAvanzarPedido}
              onCancelarPedido={onCancelarPedido}
              onRegresarPedido={onRegresarPedido}
              tiempoEnColumna={getTiempoEnColumna?.(pedido.id)}
              modoSeleccion={modoSeleccion}
              isSelected={selectedIds?.has(pedido.id) ?? false}
              onToggleSeleccion={onToggleSeleccion}
              onClickDetalle={onClickDetalle ? () => onClickDetalle(pedido) : undefined}
            />
          ))}
          {pedidos.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <i className={`fas ${dragOver ? "fa-arrow-down" : "fa-inbox"} text-2xl ${dragOver ? "text-blue-400 dark:text-blue-500 animate-bounce" : "text-gray-200 dark:text-gray-600"}`} />
              <p className="text-xs text-gray-300 dark:text-gray-600 italic">
                {dragOver ? "Suelta aquí" : "Sin pedidos"}
              </p>
            </div>
          )}
        </div>
      )}

      {isCollapsed && count > 0 && (
        <div className="flex-1 flex items-center justify-center p-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{count} pedidos</span>
        </div>
      )}
    </div>
  );
}
