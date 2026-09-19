"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Pedido } from "@/lib/supabase/types";
import type { NextAreaInfo } from "./KanbanBoard";

const RUTA_LABELS: Record<string, string> = {
  R1: "Impresión",
  R2: "Marcos",
  R3: "Books",
  R4: "Laminado",
};

function getSlaLevel(fechaEntrega: string, horaEntrega: string): "ok" | "warning" | "danger" {
  const due = new Date(`${fechaEntrega}T${horaEntrega}`).getTime();
  const now = Date.now();
  const diffMs = due - now;
  if (diffMs < 0) return "danger";
  if (diffMs < 24 * 60 * 60 * 1000) return "warning";
  return "ok";
}

const SLA_DOT = {
  ok: "bg-gray-400",
  warning: "bg-yellow-500",
  danger: "bg-red-500 animate-[wip-pulse_2s_ease-in-out_infinite]",
};

interface KanbanListViewProps {
  columnas: Record<string, Pedido[]>;
  areas: { id: string; nombre: string; color: string; orden: number }[];
  getNextForPedido: (pedido: Pedido) => NextAreaInfo[];
  onAvanzarPedido: (pedidoId: string, destino?: string) => Promise<void>;
  getTiempoEnColumna?: (pedidoId: string) => string | null;
  onClickDetalle?: (pedido: Pedido) => void;
  areaFiltro?: string;
}

const COLOR_DOT: Record<string, string> = {
  "bg-yellow-500": "bg-yellow-500",
  "bg-indigo-500": "bg-indigo-500",
  "bg-blue-500": "bg-blue-500",
  "bg-teal-500": "bg-teal-500",
  "bg-emerald-500": "bg-emerald-500",
  "bg-violet-500": "bg-violet-500",
  "bg-rose-500": "bg-rose-500",
  "bg-amber-500": "bg-amber-500",
  "bg-green-500": "bg-green-500",
  "bg-gray-500": "bg-gray-500",
};

export function KanbanListView({
  columnas,
  areas,
  getNextForPedido,
  onAvanzarPedido,
  getTiempoEnColumna,
  onClickDetalle,
  areaFiltro,
}: KanbanListViewProps) {
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [destinos, setDestinos] = useState<Record<string, string>>({});
  const [entregaPendiente, setEntregaPendiente] = useState<Pedido | null>(null);

  const areasFiltradas = areas.filter((a) => {
    if (a.id === "entregado") return false;
    if (areaFiltro && a.id !== areaFiltro) return false;
    return true;
  });

  const todosLosPedidos = areasFiltradas.flatMap((a) =>
    (columnas[a.id] || []).map((p) => ({ ...p, _area: a }))
  );

  todosLosPedidos.sort((a, b) => {
    const fa = `${a.fecha_entrega}T${a.hora_entrega}`;
    const fb = `${b.fecha_entrega}T${b.hora_entrega}`;
    return fa.localeCompare(fb);
  });

  if (todosLosPedidos.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <i className="fas fa-inbox text-4xl text-gray-200 dark:text-gray-700" />
        <p className="text-gray-400 dark:text-gray-500">No hay pedidos que mostrar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="grid grid-cols-12 gap-3 min-w-225 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
        <div className="col-span-3">Pedido / Cliente</div>
        <div className="col-span-2">Área</div>
        <div className="col-span-1">Ruta</div>
        <div className="col-span-2">Entrega</div>
        <div className="col-span-1">SLA</div>
        <div className="col-span-1">Tiempo</div>
        <div className="col-span-2">Acción</div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[calc(100vh-300px)] overflow-auto">
        {todosLosPedidos.map((p) => {
          const pedido = p as Pedido & { _area: { id: string; nombre: string; color: string } };
          const nextAreas = getNextForPedido(pedido);
          const hasMultiple = nextAreas.some((next) => next.multiple);
          const esEntrega = nextAreas.length === 1 && nextAreas[0].destination === "entregado";
          const destino = destinos[pedido.id] || "";
          const destinoSeleccionado = hasMultiple ? destino : nextAreas[0]?.destination;
          const destinoNombre = areas.find((area) => area.id === destinoSeleccionado)?.nombre || destinoSeleccionado;
          const sla = getSlaLevel(pedido.fecha_entrega, pedido.hora_entrega);
          const tiempo = getTiempoEnColumna?.(pedido.id);
          const fechaEntrega = new Date(`${pedido.fecha_entrega}T${pedido.hora_entrega}`).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          const dotColor = COLOR_DOT[pedido._area.color] || "bg-gray-500";

          return (
            <div
              key={pedido.id}
              onClick={() => onClickDetalle?.(pedido)}
              className="grid grid-cols-12 gap-3 min-w-225 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
            >
              <div className="col-span-3 min-w-0">
                <p className="text-xs font-mono text-gray-400 dark:text-gray-500 truncate">
                  {pedido.numero_pedido}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {pedido.cliente_nombre}
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                  {pedido._area.nombre}
                </span>
              </div>
              <div className="col-span-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {pedido.ruta ? RUTA_LABELS[pedido.ruta] || pedido.ruta : "-"}
                </span>
              </div>
              <div className="col-span-1">
                <span className="text-xs text-gray-600 dark:text-gray-300">{fechaEntrega}</span>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${SLA_DOT[sla]}`} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {sla === "danger" ? "Vencido" : sla === "warning" ? "Próximo" : "OK"}
                  </span>
                </div>
              </div>
              <div className="col-span-1">
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  {tiempo || "-"}
                </span>
              </div>
              <div className="col-span-2 flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                {hasMultiple && (
                  <select
                    aria-label={`Destino de ${pedido.numero_pedido || pedido.cliente_nombre}`}
                    value={destino}
                    onChange={(event) => setDestinos((current) => ({ ...current, [pedido.id]: event.target.value }))}
                    className="min-w-0 flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1.5 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Destino...</option>
                    {nextAreas.map((next) => (
                      <option key={next.destination} value={next.destination}>
                        {areas.find((area) => area.id === next.destination)?.nombre || next.destination}
                      </option>
                    ))}
                  </select>
                )}
                {nextAreas.length > 0 ? (
                  <Button
                    variant={esEntrega ? "success" : "primary"}
                    size="sm"
                    disabled={procesandoId === pedido.id || (hasMultiple && !destinoSeleccionado)}
                    onClick={() => {
                      if (esEntrega) {
                        setEntregaPendiente(pedido);
                        return;
                      }
                      setProcesandoId(pedido.id);
                      onAvanzarPedido(pedido.id, hasMultiple ? destinoSeleccionado : undefined)
                        .finally(() => {
                          setProcesandoId(null);
                          setDestinos((current) => ({ ...current, [pedido.id]: "" }));
                        });
                    }}
                    className="shrink-0"
                  >
                    {procesandoId === pedido.id ? <i className="fas fa-spinner animate-spin" /> : <i className={`fas ${esEntrega ? "fa-check" : "fa-arrow-right"}`} />}
                    <span className="sr-only">{esEntrega ? "Entregar" : `Avanzar a ${destinoNombre || "siguiente área"}`}</span>
                  </Button>
                ) : (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">Sin acción</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmModal
        open={entregaPendiente !== null}
        title="Confirmar entrega"
        message={`¿Confirmar la entrega del pedido ${entregaPendiente?.numero_pedido} para ${entregaPendiente?.cliente_nombre}?`}
        confirmLabel="Confirmar entrega"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={() => {
          if (!entregaPendiente) return;
          const pedido = entregaPendiente;
          setEntregaPendiente(null);
          setProcesandoId(pedido.id);
          onAvanzarPedido(pedido.id).finally(() => setProcesandoId(null));
        }}
        onCancel={() => setEntregaPendiente(null)}
      />
    </div>
  );
}
