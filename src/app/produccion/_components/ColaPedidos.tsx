"use client";

import React from "react";
import { TarjetaPedido } from "./TarjetaPedido";
import type { Pedido, EstadoPedido } from "@/lib/supabase/types";

interface ColaPedidosProps {
  pedidos: Pedido[];
  zona: "taller" | "corte";
  onCambiarEstado: (id: string, estado: EstadoPedido) => Promise<void>;
}

export function ColaPedidos({ pedidos, zona, onCambiarEstado }: ColaPedidosProps) {
  if (pedidos.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        No hay órdenes pendientes para esta área.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pedidos.map((pedido) => (
        <TarjetaPedido
          key={pedido.id}
          pedido={pedido}
          zona={zona}
          onCambiarEstado={onCambiarEstado}
        />
      ))}
    </div>
  );
}
