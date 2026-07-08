"use client";

import { useState, useEffect, useCallback } from "react";
import { listarPedidos, type FiltrosPedidos } from "@/lib/services/pedidos";
import type { Pedido } from "@/lib/supabase/types";

export function useHistorialPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState<
    Omit<FiltrosPedidos, "pagina" | "porPagina">
  >({ numeroPedido: "" });
  const [trigger, setTrigger] = useState(0);

  const porPagina = 20;

  useEffect(() => {
    let ignore = false;

    listarPedidos({ ...filtros, pagina, porPagina })
      .then((result) => {
        if (!ignore) {
          setPedidos(result.pedidos);
          setHasMore(result.hasMore);
          setError(null);
          setCargando(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const mensaje =
            (err instanceof Error && err.message) ||
            ((err as Record<string, unknown>)?.message as string) ||
            ((err as Record<string, unknown>)?.details as string) ||
            "Error al cargar pedidos";
          console.error("Error cargando pedidos:", err, JSON.stringify(err));
          setError(mensaje);
          setCargando(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [trigger, pagina, filtros]);

  const actualizarFiltros = useCallback(
    (nuevos: Partial<typeof filtros>) => {
      setFiltros((prev) => ({ ...prev, ...nuevos }));
      setPagina(1);
      setCargando(true);
    },
    [],
  );

  const cambiarPagina = useCallback((p: number) => {
    setPagina(p);
    setCargando(true);
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros({});
    setPagina(1);
    setCargando(true);
  }, []);

  const recargar = useCallback(() => {
    setTrigger((t) => t + 1);
    setCargando(true);
  }, []);

  return {
    pedidos,
    cargando,
    error,
    pagina,
    hasMore,
    setPagina: cambiarPagina,
    filtros,
    actualizarFiltros,
    limpiarFiltros,
    recargar,
  };
}
