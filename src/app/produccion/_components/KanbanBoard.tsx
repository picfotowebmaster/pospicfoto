"use client";

import React, { useState, useCallback, useRef } from "react";
import { KanbanColumna } from "./KanbanColumna";
import { KanbanSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import type { Pedido } from "@/lib/supabase/types";

export type NextAreaInfo = {
  destination: string;
  multiple: boolean;
};

interface KanbanBoardProps {
  columnas: Record<string, Pedido[]>;
  areas: { id: string; nombre: string; color: string; orden: number }[];
  getNextForPedido: (pedido: Pedido) => NextAreaInfo[];
  onAvanzarPedido: (pedidoId: string, destino?: string) => Promise<void>;
  onCancelarPedido?: (pedidoId: string) => Promise<void>;
  onRegresarPedido?: (pedidoId: string) => Promise<void>;
  onBulkAvanzar?: (ids: string[]) => Promise<void>;
  getTiempoEnColumna?: (pedidoId: string) => string | null;
  hayFiltrosActivos?: boolean;
  loading?: boolean;
  onClickDetalle?: (pedido: Pedido) => void;
  collapsedColumns?: Set<string>;
  onToggleColumnCollapse?: (areaId: string) => void;
  wipLimits?: Record<string, number>;
}

export function KanbanBoard({
  columnas,
  areas,
  getNextForPedido,
  onAvanzarPedido,
  onCancelarPedido,
  onRegresarPedido,
  onBulkAvanzar,
  getTiempoEnColumna,
  hayFiltrosActivos,
  loading,
  onClickDetalle,
  collapsedColumns,
  onToggleColumnCollapse,
  wipLimits,
}: KanbanBoardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [avanzandoLote, setAvanzandoLote] = useState(false);
  const columnRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const toggleSeleccion = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const areasFiltradas = areas.filter((a) => a.id !== "entregado");

  const scrollToColumn = useCallback((areaId: string) => {
    const el = columnRefs.current.get(areaId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      el.style.animation = "pulse-ring 1s ease-out";
      setTimeout(() => { el.style.animation = ""; }, 1000);
    }
  }, []);

  if (loading) {
    return <KanbanSkeleton />;
  }

  if (areasFiltradas.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <i className="fas fa-diagram-project text-4xl text-gray-200 dark:text-gray-700" />
        <p className="text-gray-400 dark:text-gray-500">No hay áreas de producción configuradas.</p>
      </div>
    );
  }

  const todosLosPedidosIds = areasFiltradas.flatMap((a) => (columnas[a.id] || []).map((p) => p.id));
  const totalPedidos = todosLosPedidosIds.length;

  if (!hayFiltrosActivos && totalPedidos === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <i className="fas fa-inbox text-4xl text-gray-200 dark:text-gray-700" />
        <p className="text-gray-400 dark:text-gray-500">No hay pedidos activos en producción.</p>
      </div>
    );
  }

  const selectedAvanciables = [...selectedIds].filter((id) => {
    const pedido = areasFiltradas
      .flatMap((a) => columnas[a.id] || [])
      .find((p) => p.id === id);
    if (!pedido) return false;
    const next = getNextForPedido(pedido);
    return next.length === 1 && !next[0].multiple;
  });

  async function handleBulkAvanzar() {
    if (selectedAvanciables.length === 0) return;
    setAvanzandoLote(true);
    try {
      await onBulkAvanzar?.(selectedAvanciables);
      setSelectedIds(new Set());
      setModoSeleccion(false);
    } finally {
      setAvanzandoLote(false);
    }
  }

  return (
    <div>
      {areasFiltradas.length > 4 && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium shrink-0 mr-1">
            Ir a:
          </span>
          {areasFiltradas.map((area) => {
            const count = (columnas[area.id] || []).length;
            const colores = { "bg-yellow-500": "bg-yellow-500", "bg-indigo-500": "bg-indigo-500", "bg-blue-500": "bg-blue-500", "bg-teal-500": "bg-teal-500", "bg-emerald-500": "bg-emerald-500", "bg-violet-500": "bg-violet-500", "bg-rose-500": "bg-rose-500", "bg-amber-500": "bg-amber-500", "bg-green-500": "bg-green-500", "bg-gray-500": "bg-gray-500" }[area.color] || "bg-gray-500";
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => scrollToColumn(area.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shrink-0"
              >
                <span className={`w-2 h-2 rounded-full ${colores}`} />
                <span className="truncate max-w-[80px]">{area.nombre}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {onBulkAvanzar && modoSeleccion && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-2 mb-3 flex items-center gap-3 animate-[slideInUp_150ms_ease-out]">
          <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">
            {selectedIds.size} seleccionados · {selectedAvanciables.length} avanzables
          </span>
          <button
            type="button"
            disabled={selectedAvanciables.length === 0 || avanzandoLote}
            onClick={handleBulkAvanzar}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors inline-flex items-center gap-1"
          >
            {avanzandoLote ? (
              <>
                <i className="fas fa-spinner animate-spin" />
                Avanzando...
              </>
            ) : "Avanzar seleccionados"}
          </button>
          <button
            type="button"
            onClick={() => {
              setModoSeleccion(false);
              setSelectedIds(new Set());
            }}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
          >
            Cancelar selección
          </button>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[70vh] kanban-scroll">
        {areasFiltradas.map((area) => (
          <KanbanColumna
            key={area.id}
            area={area}
            pedidos={columnas[area.id] || []}
            getNextForPedido={getNextForPedido}
            onAvanzarPedido={onAvanzarPedido}
            onCancelarPedido={onCancelarPedido}
            onRegresarPedido={onRegresarPedido}
            getTiempoEnColumna={getTiempoEnColumna}
            modoSeleccion={modoSeleccion}
            selectedIds={selectedIds}
            onToggleSeleccion={onBulkAvanzar ? toggleSeleccion : undefined}
            onActivarSeleccion={onBulkAvanzar ? () => setModoSeleccion(true) : undefined}
            isCollapsed={collapsedColumns?.has(area.id)}
            onToggleCollapse={onToggleColumnCollapse ? () => onToggleColumnCollapse(area.id) : undefined}
            wipLimit={wipLimits?.[area.id]}
            onClickDetalle={onClickDetalle}
            columnRef={(el) => { columnRefs.current.set(area.id, el); }}
          />
        ))}
      </div>
    </div>
  );
}
