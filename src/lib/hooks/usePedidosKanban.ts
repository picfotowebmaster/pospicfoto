"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRealtime } from "@/lib/services/realtime";
import {
  fetchPedidosByArea,
  fetchWorkflowRoutes,
  fetchUltimosMovimientos,
  advancePedido as advancePedidoService,
  regresarPedido as regresarPedidoService,
} from "@/lib/services/workflow";
import { cancelarPedido as cancelarPedidoService } from "@/lib/services/pedidos";
import { useToast } from "@/components/ui/Toast";
import { AREAS_PRODUCCION_VISIBLES, WORKFLOW_ROUTES_DATA } from "@/lib/utils/constantes";
import type { Pedido, AreaProduccion, WorkflowRoute } from "@/lib/supabase/types";

const AREAS_ACTIVAS: AreaProduccion[] = [...AREAS_PRODUCCION_VISIBLES] as AreaProduccion[];

interface NextAreaInfo {
  destination: string;
  multiple: boolean;
}

function elapsedFromTime(time: string): string {
  const diffMs = Date.now() - new Date(time).getTime();
  if (diffMs < 0) return "recién";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `${days} d`;
}

export function usePedidosKanban(areaFiltro?: string, onNuevoPedido?: (pedido: Pedido) => void) {
  const { showError, showSuccess } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [routesCache, setRoutesCache] = useState<WorkflowRoute[]>([]);
  const [tiemposEnColumna, setTiemposEnColumna] = useState<Record<string, string>>({});

  const onNuevoPedidoRef = useRef(onNuevoPedido);

  useEffect(() => {
    onNuevoPedidoRef.current = onNuevoPedido;
  }, [onNuevoPedido]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await fetchPedidosByArea(AREAS_ACTIVAS);
      setPedidos(data);
      if (data.length > 0) {
        fetchUltimosMovimientos(data.map((p: Pedido) => p.id))
          .then(setTiemposEnColumna)
          .catch(() => {});
      }
    } catch (err) {
      console.error("Error cargando pedidos kanban:", err);
      showError("Error al cargar pedidos de producción.");
    } finally {
      setCargando(false);
    }
  }, [showError]);

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
        onNuevoPedidoRef.current?.(nuevo);
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
      return routesCache.reduce<NextAreaInfo[]>((acc, r) => {
        if (r.from_area === pedido.area_actual && r.ruta === pedido.ruta) {
          acc.push({ destination: r.to_area, multiple: r.multiple });
        }
        return acc;
      }, []);
    },
    [routesCache],
  );

  const avanzarPedido = useCallback(
    async (pedidoId: string, destino?: string) => {
      try {
        await advancePedidoService(pedidoId, destino);
        showSuccess("Pedido avanzado correctamente");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al avanzar pedido";
        showError(message);
        throw err;
      }
    },
    [showError, showSuccess],
  );

  const cancelarPedido = useCallback(
    async (pedidoId: string) => {
      try {
        await cancelarPedidoService(pedidoId);
        showSuccess("Pedido cancelado");
        cargar();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cancelar pedido";
        showError(message);
        throw err;
      }
    },
    [cargar, showError, showSuccess],
  );

  const regresarPedido = useCallback(
    async (pedidoId: string) => {
      try {
        await regresarPedidoService(pedidoId);
        showSuccess("Pedido regresado al área anterior");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al regresar pedido";
        showError(message);
        throw err;
      }
    },
    [showError, showSuccess],
  );

  const bulkAvanzar = useCallback(
    async (ids: string[]) => {
      let ok = 0;
      let fail = 0;
      for (const id of ids) {
        try {
          await advancePedidoService(id);
          ok++;
        } catch {
          fail++;
        }
      }
      if (ok > 0) showSuccess(`${ok} pedidos avanzados`);
      if (fail > 0) showError(`${fail} pedidos no se pudieron avanzar`);
    },
    [showError, showSuccess],
  );

  const getTiempoEnColumna = useCallback(
    (pedidoId: string) => {
      const ts = tiemposEnColumna[pedidoId];
      return ts ? elapsedFromTime(ts) : null;
    },
    [tiemposEnColumna],
  );

  return {
    columnas,
    pedidos,
    cargando,
    getNextForPedido,
    avanzarPedido,
    cancelarPedido,
    regresarPedido,
    bulkAvanzar,
    getTiempoEnColumna,
    recargar: cargar,
  };
}
