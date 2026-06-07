"use client";

import { useState, useEffect, useCallback } from "react";
import { useRealtime } from "@/lib/services/realtime";
import { fetchPedidosPorEstado, actualizarEstadoPedido } from "@/lib/services/pedidos";
import type { Pedido, EstadoPedido } from "@/lib/supabase/types";

export function usePedidoStream(estados: EstadoPedido[]) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await fetchPedidosPorEstado(estados);
      setPedidos(data);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useRealtime("pedidos-stream", "pedidos", "*", (payload: any) => {
    if (payload.eventType === "INSERT") {
      const nuevo = payload.new;
      if (estados.includes(nuevo.estado)) {
        setPedidos((prev) => {
          const existe = prev.find((p) => p.id === nuevo.id);
          if (existe) return prev;
          return [nuevo, ...prev];
        });
      }
    } else if (payload.eventType === "UPDATE") {
      const actualizado = payload.new;
      setPedidos((prev) => {
        if (!estados.includes(actualizado.estado)) {
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

  const cambiarEstado = useCallback(
    async (pedidoId: string, nuevoEstado: EstadoPedido) => {
      await actualizarEstadoPedido(pedidoId, nuevoEstado);
    },
    [],
  );

  return { pedidos, cargando, cambiarEstado, recargar: cargar };
}
