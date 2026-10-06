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
import {
  cancelarPedido as cancelarPedidoService,
  actualizarPrioridad as actualizarPrioridadService,
  asignarPedido as asignarPedidoService,
  actualizarNotas as actualizarNotasService,
  actualizarCorreccion as actualizarCorreccionService,
  liquidarSaldo as liquidarSaldoService,
} from "@/lib/services/pedidos";
import { useToast } from "@/components/ui/Toast";
import { enviarPushArea } from "@/lib/services/notifications";
import { AREAS_PRODUCCION_VISIBLES, WORKFLOW_ROUTES_DATA } from "@/lib/utils/constantes";
import { elapsedFromTime, getAgingLevel, type SlaLevel } from "@/lib/utils/pedido";
import type { Pedido, AreaProduccion, WorkflowRoute, PrioridadPedido, MetodoPago } from "@/lib/supabase/types";

const AREAS_ACTIVAS: AreaProduccion[] = [...AREAS_PRODUCCION_VISIBLES] as AreaProduccion[];

interface NextAreaInfo {
  destination: string;
  multiple: boolean;
}

export function usePedidosKanban(areaFiltro?: string, onNuevoPedido?: (pedido: Pedido) => void) {
  const { showError, showSuccess, showToast } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [routesCache, setRoutesCache] = useState<WorkflowRoute[]>([]);
  const [tiemposEnColumna, setTiemposEnColumna] = useState<Record<string, string>>({});
  const [, setTick] = useState(0);

  const onNuevoPedidoRef = useRef(onNuevoPedido);
  const pedidosRef = useRef<Pedido[]>([]);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onNuevoPedidoRef.current = onNuevoPedido;
  }, [onNuevoPedido]);

  useEffect(() => {
    pedidosRef.current = pedidos;
  }, [pedidos]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const refrescarTiempos = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      const ids = pedidosRef.current.map((p) => p.id);
      if (ids.length === 0) return;
      fetchUltimosMovimientos(ids)
        .then(setTiemposEnColumna)
        .catch(() => {});
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const cargar = useCallback(async () => {
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

  const recargar = useCallback(() => {
    setCargando(true);
    cargar();
  }, [cargar]);

  useEffect(() => {
    let ignore = false;
    fetchPedidosByArea(AREAS_ACTIVAS)
      .then((data) => {
        if (ignore) return;
        setPedidos(data);
        if (data.length > 0) {
          fetchUltimosMovimientos(data.map((p: Pedido) => p.id))
            .then((tiempos) => {
              if (!ignore) setTiemposEnColumna(tiempos);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (ignore) return;
        console.error("Error cargando pedidos kanban:", err);
        showError("Error al cargar pedidos de producción.");
      })
      .finally(() => {
        if (!ignore) setCargando(false);
      });
    return () => {
      ignore = true;
    };
  }, [showError]);

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
        refrescarTiempos();
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
      refrescarTiempos();
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
        const pedido = pedidosRef.current.find((p) => p.id === pedidoId);
        if (pedido) {
          const next = getNextForPedido(pedido);
          const target = destino ?? (next.length === 1 ? next[0].destination : undefined);
          if (target && target !== "entregado" && target !== "listo") {
            enviarPushArea({
              title: "Pedido en tu área",
              body: `${pedido.cliente_nombre}${pedido.numero_pedido ? ` · ${pedido.numero_pedido}` : ""}`,
              area: target,
              tag: `area-${target}`,
            });
          }
        }
        showToast("success", "Pedido avanzado correctamente", {
          label: "Deshacer",
          onClick: () => {
            regresarPedidoService(pedidoId)
              .then(() => cargar())
              .catch(() => showError("No se pudo deshacer el movimiento"));
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al avanzar pedido";
        showError(message);
        throw err;
      }
    },
    [cargar, getNextForPedido, showError, showToast],
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

  const actualizarLocal = useCallback((pedidoId: string, patch: Partial<Pedido>) => {
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, ...patch } : p)),
    );
  }, []);

  const cambiarPrioridad = useCallback(
    async (pedidoId: string, prioridad: PrioridadPedido) => {
      try {
        await actualizarPrioridadService(pedidoId, prioridad);
        actualizarLocal(pedidoId, { prioridad });
      } catch (err) {
        showError(err instanceof Error ? err.message : "Error al cambiar prioridad");
        throw err;
      }
    },
    [actualizarLocal, showError],
  );

  const asignarOperador = useCallback(
    async (pedidoId: string, usuarioId: string | null) => {
      try {
        await asignarPedidoService(pedidoId, usuarioId);
        actualizarLocal(pedidoId, { asignado_a: usuarioId });
      } catch (err) {
        showError(err instanceof Error ? err.message : "Error al asignar pedido");
        throw err;
      }
    },
    [actualizarLocal, showError],
  );

  const guardarNotas = useCallback(
    async (pedidoId: string, notas: string | null) => {
      try {
        await actualizarNotasService(pedidoId, notas);
        actualizarLocal(pedidoId, { notas });
      } catch (err) {
        showError(err instanceof Error ? err.message : "Error al guardar notas");
        throw err;
      }
    },
    [actualizarLocal, showError],
  );

  const marcarCorreccion = useCallback(
    async (pedidoId: string, requiere: boolean, motivo: string | null) => {
      try {
        await actualizarCorreccionService(pedidoId, requiere, motivo);
        actualizarLocal(pedidoId, {
          requiere_correccion: requiere,
          motivo_correccion: requiere ? motivo : null,
        });
        if (requiere) {
          const pedido = pedidosRef.current.find((p) => p.id === pedidoId);
          enviarPushArea({
            title: "Corrección solicitada",
            body: `${pedido ? pedido.cliente_nombre : ""}${motivo ? ` · ${motivo}` : ""}`.trim(),
            roles: ["admin", "superadmin"],
            tag: "correccion",
          });
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Error al actualizar corrección");
        throw err;
      }
    },
    [actualizarLocal, showError],
  );

  const liquidarSaldo = useCallback(
    async (pedidoId: string, metodo: MetodoPago) => {
      try {
        await liquidarSaldoService(pedidoId, metodo);
        actualizarLocal(pedidoId, {
          saldo_cobrado: true,
          saldo_metodo_pago: metodo,
          saldo_cobrado_en: new Date().toISOString(),
        });
        showSuccess("Cobro de saldo registrado");
      } catch (err) {
        showError(err instanceof Error ? err.message : "Error al registrar el cobro");
        throw err;
      }
    },
    [actualizarLocal, showError, showSuccess],
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

  const getTiempoEnColumnaNivel = useCallback(
    (pedidoId: string): SlaLevel | null => {
      const ts = tiemposEnColumna[pedidoId];
      return ts ? getAgingLevel(ts) : null;
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
    cambiarPrioridad,
    asignarOperador,
    guardarNotas,
    marcarCorreccion,
    liquidarSaldo,
    getTiempoEnColumna,
    getTiempoEnColumnaNivel,
    recargar,
  };
}
