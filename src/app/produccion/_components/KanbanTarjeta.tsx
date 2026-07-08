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
  onCancelarPedido?: (pedidoId: string) => Promise<void>;
}

export function KanbanTarjeta({
  pedido,
  nextAreas,
  onAvanzarPedido,
  onCancelarPedido,
}: KanbanTarjetaProps) {
  const [cambiando, setCambiando] = useState(false);
  const [destino, setDestino] = useState("");
  const [cancelando, setCancelando] = useState(false);

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

  async function handleCancelar() {
    if (!window.confirm("\u00bfCancelar este pedido?")) return;
    setCancelando(true);
    try {
      await onCancelarPedido?.(pedido.id);
    } finally {
      setCancelando(false);
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      {pedido.numero_pedido && (
        <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">
          {pedido.numero_pedido}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
          {pedido.cliente_nombre}
        </span>
        {pedido.ruta && (
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5">
            {RUTA_LABELS[pedido.ruta] || pedido.ruta}
          </span>
        )}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded px-2 py-1 text-center">
        <span className="text-[11px] text-yellow-800 dark:text-yellow-300 font-semibold">
          {fechaEntrega}
        </span>
      </div>

      {pedido.requiere_correccion && (
        <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/30 rounded px-1.5 py-0.5 inline-block">
          Corrección
        </span>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
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
              className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-700 dark:text-gray-200"
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
            {cambiando ? "..." : esEntrega ? (
              <><i className="fas fa-check mr-1" />Entregar</>
            ) : (
              <>Avanzar <i className="fas fa-arrow-right ml-1" /></>
            )}
          </Button>
        </div>
      )}

      {onCancelarPedido && (
        <button
          onClick={handleCancelar}
          disabled={cancelando}
          className="w-full text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded px-2 py-1 transition-colors cursor-pointer disabled:opacity-50"
        >
          {cancelando ? "Cancelando..." : "Cancelar pedido"}
        </button>
      )}
    </div>
  );
}
