"use client";

import { useCallback, useMemo } from "react";
import { useRealtime } from "@/lib/services/realtime";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import {
  derivarNotificacion,
  type Notificacion,
  type TipoNotificacion,
  type RealtimePayload,
} from "@/lib/utils/notificaciones";

const MAX_NOTIFICACIONES = 50;

export function useNotificaciones(areaFiltro?: string) {
  const [notificaciones, setNotificaciones] = usePersistentState<Notificacion[]>(
    "notif.v1",
    [],
  );
  const [filtroTipo, setFiltroTipo] = usePersistentState<TipoNotificacion | "">(
    "notif.tipo",
    "",
  );
  const [soloMiArea, setSoloMiArea] = usePersistentState<boolean>(
    "notif.miArea",
    false,
  );

  const handle = useCallback(
    (payload: unknown) => {
      const notif = derivarNotificacion(payload as RealtimePayload);
      if (!notif) return;
      setNotificaciones((prev) => [notif, ...prev].slice(0, MAX_NOTIFICACIONES));
    },
    [setNotificaciones],
  );

  useRealtime("notif-pedidos", "pedidos", "*", handle);

  const visibles = useMemo(() => {
    return notificaciones.filter((n) => {
      if (filtroTipo && n.tipo !== filtroTipo) return false;
      if (soloMiArea && areaFiltro && n.area !== areaFiltro) return false;
      return true;
    });
  }, [notificaciones, filtroTipo, soloMiArea, areaFiltro]);

  const noLeidas = useMemo(
    () => visibles.filter((n) => !n.leida).length,
    [visibles],
  );

  const marcarLeida = useCallback(
    (id: string) => {
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
      );
    },
    [setNotificaciones],
  );

  const marcarTodasLeidas = useCallback(() => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  }, [setNotificaciones]);

  const limpiar = useCallback(() => {
    setNotificaciones([]);
  }, [setNotificaciones]);

  return {
    notificaciones: visibles,
    total: notificaciones.length,
    noLeidas,
    filtroTipo,
    setFiltroTipo,
    soloMiArea,
    setSoloMiArea,
    marcarLeida,
    marcarTodasLeidas,
    limpiar,
  };
}
