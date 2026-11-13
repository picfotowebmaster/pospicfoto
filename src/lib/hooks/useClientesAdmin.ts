"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listarClientesAdmin,
  type FiltrosClientesAdmin,
} from "@/lib/services/clientesAdmin";
import type { Cliente } from "@/lib/supabase/types";

const DEBOUNCE_MS = 300;

export function useClientesAdmin() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusquedaState] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPaginaState] = useState(1);
  const [porPagina, setPorPaginaState] = useState(20);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  const busquedaAplicadaRef = useRef(busquedaAplicada);
  const paginaRef = useRef(pagina);

  useEffect(() => {
    busquedaAplicadaRef.current = busquedaAplicada;
  }, [busquedaAplicada]);

  useEffect(() => {
    paginaRef.current = pagina;
  }, [pagina]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const siguiente = busqueda.trim();
      const cambioBusqueda = siguiente !== busquedaAplicadaRef.current;
      const cambioPagina = paginaRef.current !== 1;

      if (!cambioBusqueda && !cambioPagina) return;

      setCargando(true);
      setError(null);
      setBusquedaAplicada(siguiente);
      setPaginaState(1);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [busqueda]);

  useEffect(() => {
    let ignore = false;

    const filtros: FiltrosClientesAdmin = {
      busqueda: busquedaAplicada,
      pagina,
      porPagina,
    };

    listarClientesAdmin(filtros)
      .then((resultado) => {
        if (ignore) return;
        setClientes(resultado.clientes);
        setTotal(resultado.total);
        setError(null);
        setCargando(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const mensaje =
          (err instanceof Error && err.message) ||
          ((err as Record<string, unknown>)?.message as string) ||
          "Error al cargar clientes";
        setError(mensaje);
        setCargando(false);
      });

    return () => {
      ignore = true;
    };
  }, [busquedaAplicada, pagina, porPagina, trigger]);

  const setBusqueda = useCallback((valor: string) => {
    setBusquedaState(valor);
  }, []);

  const setPagina = useCallback((valor: number) => {
    setCargando(true);
    setError(null);
    setPaginaState(valor);
  }, []);

  const setPorPagina = useCallback((valor: number) => {
    setCargando(true);
    setError(null);
    setPorPaginaState(valor);
    setPaginaState(1);
  }, []);

  const recargar = useCallback(() => {
    setCargando(true);
    setError(null);
    setTrigger((valor) => valor + 1);
  }, []);

  return {
    clientes,
    busqueda,
    setBusqueda,
    pagina,
    setPagina,
    porPagina,
    setPorPagina,
    total,
    cargando,
    error,
    recargar,
    hasMore: pagina * porPagina < total,
  };
}
