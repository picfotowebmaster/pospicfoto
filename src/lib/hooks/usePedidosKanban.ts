"use client";

import { useState, useEffect, useCallback } from "react";
import { useRealtime } from "@/lib/services/realtime";
import {
  fetchPedidosByArea,
  fetchWorkflowRoutes,
  advancePedido as advancePedidoService,
} from "@/lib/services/workflow";
import { AREAS_PRODUCCION_VISIBLES, WORKFLOW_ROUTES_DATA } from "@/lib/utils/constantes";
import type { Pedido, AreaProduccion, WorkflowRoute } from "@/lib/supabase/types";

const AREAS_ACTIVAS: AreaProduccion[] = [...AREAS_PRODUCCION_VISIBLES] as AreaProduccion[];

interface NextAreaInfo {
  destination: string;
  multiple: boolean;
}

export function usePedidosKanban(areaFiltro?: string) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [routesCache, setRoutesCache] = useState<WorkflowRoute[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await fetchPedidosByArea(AREAS_ACTIVAS);
      setPedidos(data);
    } catch (err) {
      console.error("Error cargando pedidos kanban:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    fetchWorkflowRoutes()
      .then((data) => setRoutesCache(data as WorkflowRoute[]))
      .catch((err: unknown) => {
        const e = err as { code?: string; message?: string; details?: string };
        console.error("PostgREST workflow_routes:", e.code, e.message, e.details);
        setRoutesCache(WORKFLOW_ROUTES_DATA as WorkflowRoute[]);
      });
  }, []);

  useRealtime("kanban-stream", "pedidos", "*", (payload: Record<string, unknown>) => {
    if (payload.eventType === "INSERT") {
      const nuevo = payload.new as Pedido;
      if (AREAS_ACTIVAS.includes(nuevo.area_actual)) {
        setPedidos((prev) => {
          if (prev.find((p) => p.id === nuevo.id)) return prev;
          return [nuevo, ...prev];
        });
      }
    } else if (payload.eventType === "UPDATE") {
      const actualizado = payload.new as Pedido;
      setPedidos((prev) => {
        if (!AREAS_ACTIVAS.includes(actualizado.area_actual)) {
          return prev.filter((p) => p.id !== actualizado.id);
        }
        return prev.map((p) =>
          p.id === actualizado.id ? { ...p, ...actualizado } : p,
        );
      });
    } else if (payload.eventType === "DELETE") {
      const eliminado = payload.old as Pedido;
      if (eliminado) {
        setPedidos((prev) => prev.filter((p) => p.id !== eliminado.id));
      }
    }
  });

  const columnasCompletas = pedidos.reduce(
    (acc, pedido) => {
      const area = pedido.area_actual;
      if (!acc[area]) acc[area] = [];
      acc[area].push(pedido);
      return acc;
    },
    {} as Record<string, Pedido[]>,
  );

  const columnas = areaFiltro
    ? { [areaFiltro]: columnasCompletas[areaFiltro] || [] }
    : columnasCompletas;

  const getNextForPedido = useCallback(
    (pedido: Pedido): NextAreaInfo[] => {
      if (!pedido.ruta) return [];
      return routesCache
        .filter((r) => r.from_area === pedido.area_actual && r.ruta === pedido.ruta)
        .map((r) => ({ destination: r.to_area, multiple: r.multiple }));
    },
    [routesCache],
  );

  const avanzarPedido = useCallback(
    async (pedidoId: string, destino?: string) => {
      await advancePedidoService(pedidoId, destino);
    },
    [],
  );

  return { columnas, pedidos, cargando, getNextForPedido, avanzarPedido, recargar: cargar };
}
