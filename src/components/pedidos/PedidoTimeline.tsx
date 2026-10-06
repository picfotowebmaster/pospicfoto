"use client";

import { useEffect, useState } from "react";
import { fetchMovimientosByPedido } from "@/lib/services/workflow";
import { AREAS_PRODUCCION_DATA } from "@/lib/utils/constantes";
import type { PedidoMovimiento } from "@/lib/supabase/types";

interface PedidoTimelineProps {
  pedidoId: string;
  areas?: { id: string; nombre: string }[];
}

export function PedidoTimeline({ pedidoId, areas = [] }: PedidoTimelineProps) {
  const [historial, setHistorial] = useState<{
    id: string;
    movimientos: PedidoMovimiento[];
  } | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchMovimientosByPedido(pedidoId)
      .then((data) => {
        if (!ignore) setHistorial({ id: pedidoId, movimientos: data });
      })
      .catch(() => {
        if (!ignore) setHistorial({ id: pedidoId, movimientos: [] });
      });
    return () => {
      ignore = true;
    };
  }, [pedidoId]);

  const cargando = historial?.id !== pedidoId;
  const movimientos = historial && historial.id === pedidoId ? historial.movimientos : [];

  function areaNombre(id?: string | null) {
    if (!id) return "—";
    return (
      areas.find((a) => a.id === id)?.nombre ||
      AREAS_PRODUCCION_DATA.find((a) => a.id === id)?.nombre ||
      id
    );
  }

  if (cargando) {
    return <p className="text-xs text-gray-400 dark:text-gray-500">Cargando historial...</p>;
  }

  if (movimientos.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500">Sin movimientos registrados.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-1.5 space-y-3">
      {movimientos.map((m) => (
        <li key={m.id} className="ml-4">
          <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
            {areaNombre(m.from_area)} → {areaNombre(m.to_area)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(m.created_at).toLocaleString("es-MX", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </li>
      ))}
    </ol>
  );
}
