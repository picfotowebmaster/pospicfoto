"use client";

import { useState, useEffect, useCallback } from "react";
import { listarPedidos, contarPedidos, type FiltrosPedidos } from "@/lib/services/pedidos";
import type { Pedido } from "@/lib/supabase/types";

export function useHistorialPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPaginaState] = useState(20);
  const [filtros, setFiltros] = useState<
    Omit<FiltrosPedidos, "pagina" | "porPagina">
  >({ numeroPedido: "" });
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      listarPedidos({ ...filtros, pagina, porPagina }),
      contarPedidos(filtros).catch(() => 0),
    ])
      .then(([result, count]) => {
        if (!ignore) {
          setPedidos(result.pedidos);
          setHasMore(result.hasMore);
          setTotal(count);
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
  }, [trigger, pagina, filtros, porPagina]);

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

  const cambiarPorPagina = useCallback((n: number) => {
    setPorPaginaState(n);
    setPagina(1);
    setCargando(true);
  }, []);

  return {
    pedidos,
    cargando,
    error,
    pagina,
    hasMore,
    total,
    porPagina,
    setPorPagina: cambiarPorPagina,
    setPagina: cambiarPagina,
    filtros,
    actualizarFiltros,
    limpiarFiltros,
    recargar,
  };
}
