"use client";

import React from "react";
import { KanbanColumna } from "./KanbanColumna";
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
}

export function KanbanBoard({
  columnas,
  areas,
  getNextForPedido,
  onAvanzarPedido,
  onCancelarPedido,
}: KanbanBoardProps) {
  const areasFiltradas = areas.filter((a) => a.id !== "entregado");

  if (areasFiltradas.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        No hay áreas de producción configuradas.
      </div>
    );
  }

  const areasConPedidos = areasFiltradas.filter(
    (a) => (columnas[a.id] || []).length > 0,
  );

  if (areasConPedidos.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        No hay pedidos activos en producción.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[70vh]">
      {areasConPedidos.map((area) => (
        <KanbanColumna
          key={area.id}
          area={area}
          pedidos={columnas[area.id] || []}
          getNextForPedido={getNextForPedido}
          onAvanzarPedido={onAvanzarPedido}
          onCancelarPedido={onCancelarPedido}
        />
      ))}
    </div>
  );
}
