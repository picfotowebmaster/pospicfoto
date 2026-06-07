"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ESTADOS_PEDIDO } from "@/lib/utils/constantes";
import type { Pedido, EstadoPedido } from "@/lib/supabase/types";

interface TarjetaPedidoProps {
  pedido: Pedido;
  zona: "taller" | "corte";
  onCambiarEstado: (id: string, estado: EstadoPedido) => Promise<void>;
}

export function TarjetaPedido({
  pedido,
  zona,
  onCambiarEstado,
}: TarjetaPedidoProps) {
  const estadoInfo = ESTADOS_PEDIDO.find((e) => e.value === pedido.estado);

  const siguienteEstado: EstadoPedido | null = (() => {
    if (zona === "taller" && pedido.estado === "pendiente") return "en_taller";
    if (zona === "taller" && pedido.estado === "en_taller") return "en_corte";
    if (zona === "corte" && pedido.estado === "en_corte") return "listo";
    return null;
  })();

  return (
    <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500 space-y-3">
      <div className="flex items-center justify-between">
        <Badge color={estadoInfo?.color || "bg-gray-500"}>
          {estadoInfo?.label || pedido.estado}
        </Badge>
        <span className="text-xs text-gray-400">
          {pedido.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">
          {pedido.cliente_nombre}
        </div>
        {pedido.cliente_telefono && (
          <div className="text-xs text-gray-500">{pedido.cliente_telefono}</div>
        )}
      </div>

      <div className="bg-yellow-50 rounded-lg px-2 py-1 text-center">
        <span className="text-xs text-yellow-800 font-bold">
          ENTREGA: {new Date(pedido.fecha_entrega + "T" + pedido.hora_entrega).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {pedido.requiere_correccion && (
        <Badge color="bg-orange-500">Con Corrección</Badge>
      )}

      <div className="space-y-2">
        {pedido.detalle_pedidos?.map((d) => (
          <div key={d.id} className="bg-gray-50 rounded-lg p-2 text-sm">
            <div className="font-semibold text-gray-800">
              {d.producto_nombre}{" "}
              <span className="text-gray-500">x{d.cantidad}</span>
            </div>
            {d.atributos &&
              Object.entries(d.atributos).map(([k, v]) => (
                <div key={k} className="text-xs text-gray-500 ml-2">
                  • {k}: {v}
                </div>
              ))}
          </div>
        ))}
      </div>

      {siguienteEstado && (
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => onCambiarEstado(pedido.id, siguienteEstado)}
        >
          {zona === "taller" && pedido.estado === "pendiente"
            ? "Iniciar Producción"
            : zona === "taller" && pedido.estado === "en_taller"
              ? "Enviar a Corte"
              : "Marcar como Listo"}
        </Button>
      )}
    </div>
  );
}
