"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Pedido } from "@/lib/supabase/types";
import type { NextAreaInfo } from "./KanbanBoard";

const RUTA_LABELS: Record<string, string> = {
  R1: "Impresión",
  R2: "Marcos",
  R3: "Books",
  R4: "Laminado",
};

interface KanbanTarjetaProps {
  pedido: Pedido;
  nextAreas: NextAreaInfo[];
  onAvanzarPedido: (pedidoId: string, destino?: string) => Promise<void>;
}

export function KanbanTarjeta({
  pedido,
  nextAreas,
  onAvanzarPedido,
}: KanbanTarjetaProps) {
  const [cambiando, setCambiando] = useState(false);
  const [destino, setDestino] = useState("");

  const hasMultiple = nextAreas.some((n) => n.multiple);
  const puedeAvanzar = nextAreas.length > 0;
  const esEntrega = nextAreas.length === 1 && nextAreas[0].destination === "entregado";

  async function handleAvanzar() {
    if (hasMultiple && !destino) return;
    setCambiando(true);
    try {
      await onAvanzarPedido(pedido.id, hasMultiple ? destino : undefined);
    } finally {
      setCambiando(false);
      setDestino("");
    }
  }

  const fechaEntrega = new Date(
    pedido.fecha_entrega + "T" + pedido.hora_entrega,
  ).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lineas = pedido.detalle_pedidos ?? [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-900 truncate max-w-[140px]">
          {pedido.cliente_nombre}
        </span>
        {pedido.ruta && (
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
            {RUTA_LABELS[pedido.ruta] || pedido.ruta}
          </span>
        )}
      </div>

      <div className="bg-yellow-50 rounded px-2 py-1 text-center">
        <span className="text-[11px] text-yellow-800 font-semibold">
          {fechaEntrega}
        </span>
      </div>

      {pedido.requiere_correccion && (
        <span className="text-[10px] text-orange-600 font-medium bg-orange-50 rounded px-1.5 py-0.5 inline-block">
          Corrección
        </span>
      )}

      <div className="text-xs text-gray-500 space-y-0.5">
        {lineas.length === 1 ? (
          <span className="truncate block">{lineas[0].producto_nombre}</span>
        ) : (
          <span>{lineas.length} productos</span>
        )}
      </div>

      {puedeAvanzar && (
        <div className="space-y-1.5">
          {hasMultiple && (
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
            >
              <option value="">Seleccionar destino...</option>
              {nextAreas.map((n) => (
                <option key={n.destination} value={n.destination}>
                  {n.destination}
                </option>
              ))}
            </select>
          )}
          <Button
            variant={esEntrega ? "success" : "primary"}
            size="sm"
            className="w-full text-xs"
            disabled={cambiando || (hasMultiple && !destino)}
            onClick={handleAvanzar}
          >
            {cambiando ? "..." : esEntrega ? "Entregar ✓" : "Avanzar →"}
          </Button>
        </div>
      )}
    </div>
  );
}
