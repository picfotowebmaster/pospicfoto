"use client";

import React, { useState, useMemo, useRef, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Pedido } from "@/lib/supabase/types";
import type { NextAreaInfo } from "./KanbanBoard";

const RUTA_LABELS: Record<string, string> = {
  R1: "Impresión",
  R2: "Marcos",
  R3: "Books",
  R4: "Laminado",
};

type SlaLevel = "ok" | "warning" | "danger";

const SLA_BORDER: Record<SlaLevel, string> = {
  ok: "border-l-gray-200 dark:border-l-gray-700",
  warning: "border-l-yellow-400 dark:border-l-yellow-500",
  danger: "border-l-red-400 dark:border-l-red-500",
};

const SLA_BADGE: Record<SlaLevel, { bg: string; text: string; label: string }> = {
  ok: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-500 dark:text-gray-400", label: "" },
  warning: { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300", label: "Próximo" },
  danger: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", label: "Vencido" },
};

function getSlaLevel(fechaEntrega: string, horaEntrega: string): SlaLevel {
  const due = new Date(`${fechaEntrega}T${horaEntrega}`).getTime();
  const now = Date.now();
  const diffMs = due - now;
  if (diffMs < 0) return "danger";
  if (diffMs < 24 * 60 * 60 * 1000) return "warning";
  return "ok";
}

function formatAttrs(attrs: Record<string, string>) {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

interface KanbanTarjetaProps {
  pedido: Pedido;
  nextAreas: NextAreaInfo[];
  onAvanzarPedido: (pedidoId: string, destino?: string) => Promise<void>;
  onCancelarPedido?: (pedidoId: string) => Promise<void>;
  onRegresarPedido?: (pedidoId: string) => Promise<void>;
  tiempoEnColumna?: string | null;
  modoSeleccion?: boolean;
  isSelected?: boolean;
  onToggleSeleccion?: (id: string) => void;
  onClickDetalle?: () => void;
}

export function KanbanTarjeta({
  pedido,
  nextAreas,
  onAvanzarPedido,
  onCancelarPedido,
  onRegresarPedido,
  tiempoEnColumna,
  modoSeleccion,
  isSelected,
  onToggleSeleccion,
  onClickDetalle,
}: KanbanTarjetaProps) {
  const [cambiando, setCambiando] = useState(false);
  const [destino, setDestino] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [regresando, setRegresando] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<"cancelar" | "regresar" | "entregar" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const lineas = pedido.detalle_pedidos ?? [];
  const hasMultiple = nextAreas.some((n) => n.multiple);
  const puedeAvanzar = nextAreas.length > 0;
  const esEntrega = nextAreas.length === 1 && nextAreas[0].destination === "entregado";
  const destinoSeleccionado = hasMultiple ? destino : nextAreas[0]?.destination;
  const totalItems = lineas.reduce((sum, l) => sum + l.cantidad, 0);
  const resumenLineas = lineas
    .slice(0, 2)
    .map((l) => `${l.cantidad}x ${l.producto_nombre}`)
    .join(" · ");

  const sla = useMemo(
    () => getSlaLevel(pedido.fecha_entrega, pedido.hora_entrega),
    [pedido.fecha_entrega, pedido.hora_entrega],
  );

  const slaBadge = SLA_BADGE[sla];

  async function handleAvanzar() {
    const nextDestino = destinoSeleccionado;
    if (hasMultiple && !nextDestino) return;
    if (esEntrega) {
      setConfirmOpen("entregar");
      return;
    }
    setCambiando(true);
    try {
      await onAvanzarPedido(pedido.id, hasMultiple ? nextDestino : undefined);
    } finally {
      setCambiando(false);
      setDestino("");
    }
  }

  async function executeAvanzar() {
    setConfirmOpen(null);
    setCambiando(true);
    try {
      await onAvanzarPedido(pedido.id, hasMultiple ? destinoSeleccionado : undefined);
    } finally {
      setCambiando(false);
      setDestino("");
    }
  }

  async function handleCancelar() {
    setConfirmOpen("cancelar");
  }

  async function executeCancelar() {
    setConfirmOpen(null);
    setCancelando(true);
    try {
      await onCancelarPedido?.(pedido.id);
    } finally {
      setCancelando(false);
    }
  }

  async function handleRegresar() {
    setConfirmOpen("regresar");
  }

  async function executeRegresar() {
    setConfirmOpen(null);
    setRegresando(true);
    try {
      await onRegresarPedido?.(pedido.id);
    } finally {
      setRegresando(false);
    }
  }

  function handleDragStart(e: DragEvent) {
    if (modoSeleccion) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", JSON.stringify({ pedidoId: pedido.id, hasMultiple }));
    e.dataTransfer.effectAllowed = "move";
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(cardRef.current, e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  const fechaEntrega = new Date(
    `${pedido.fecha_entrega}T${pedido.hora_entrega}`,
  ).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div
        ref={cardRef}
        draggable={!modoSeleccion}
        onDragStart={handleDragStart}
        onClick={() => {
          if (!modoSeleccion && onClickDetalle) onClickDetalle();
        }}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 ${SLA_BORDER[sla]} p-3 space-y-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${modoSeleccion ? "" : "cursor-pointer active:scale-[0.98]"} ${isSelected ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""}`}
      >
        {pedido.numero_pedido && (
          <div className="flex items-center gap-2">
            {modoSeleccion && onToggleSeleccion && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSeleccion(pedido.id);
                }}
                className="cursor-pointer rounded"
              />
            )}
            <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">
              {pedido.numero_pedido}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate block">
              {pedido.cliente_nombre}
            </span>
            {pedido.ruta && (
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 inline-block mt-1">
                {RUTA_LABELS[pedido.ruta] || pedido.ruta}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">{fechaEntrega}</div>
            {tiempoEnColumna && (
              <Tooltip content="Tiempo en esta área">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 inline-flex items-center gap-0.5">
                  <i className="fas fa-clock" />
                  {tiempoEnColumna}
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {slaBadge.label && (
            <div className={`rounded px-2 py-1 text-[10px] font-semibold ${slaBadge.bg} ${slaBadge.text}`}>
              {sla === "danger" ? "URGENTE" : slaBadge.label}
            </div>
          )}
          {pedido.requiere_correccion && (
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-900/30 rounded px-2 py-1">
              Corrección
            </span>
          )}
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-200">
          <div className="font-semibold">{totalItems} unidad{totalItems === 1 ? "" : "es"}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {resumenLineas || "Sin detalles"}
            {lineas.length > 2 && ` · +${lineas.length - 2} más`}
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          {lineas.length === 1 ? (
            <span className="truncate block">{lineas[0].producto_nombre}</span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((current) => !current);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium cursor-pointer flex items-center gap-1"
            >
              {lineas.length} productos
              <i className={`fas fa-chevron-${expanded ? "up" : "down"} text-[10px]`} />
            </button>
          )}
        </div>

        {expanded && lineas.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1.5 space-y-1 max-h-24 overflow-y-auto animate-[slideInUp_150ms_ease-out]">
            {lineas.map((l, i) => (
              <div key={l.id || i} className="text-[10px]">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {l.cantidad}x {l.producto_nombre}
                </span>
                {l.atributos && Object.keys(l.atributos).length > 0 && (
                  <span className="text-gray-400 dark:text-gray-500 ml-1">
                    ({formatAttrs(l.atributos)})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {puedeAvanzar && !modoSeleccion && (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {hasMultiple && (
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              >
                <option value="">Destino...</option>
                {nextAreas.map((n) => (
                  <option key={n.destination} value={n.destination}>
                    {n.destination}
                  </option>
                ))}
              </select>
            )}
            <Tooltip content={esEntrega ? "Marcar como entregado" : "Avanzar al siguiente paso"}>
              <Button
                variant={esEntrega ? "success" : "primary"}
                size="sm"
                className="w-full text-sm transition-all duration-200"
                disabled={cambiando || (hasMultiple && !destinoSeleccionado)}
                onClick={handleAvanzar}
              >
                {cambiando ? (
                  <span className="inline-flex items-center gap-1">
                    <i className="fas fa-spinner animate-spin" />
                    Procesando...
                  </span>
                ) : esEntrega ? (
                  <span className="inline-flex items-center gap-1">
                    <i className="fas fa-check-circle" />
                    Entregar pedido
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <i className="fas fa-arrow-right" />
                    Avanzar
                  </span>
                )}
              </Button>
            </Tooltip>
          </div>
        )}

        {!modoSeleccion && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {onRegresarPedido && (
              <Tooltip content="Regresar al área anterior">
                <button
                  type="button"
                  onClick={handleRegresar}
                  disabled={regresando}
                  className="flex-1 text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded px-2 py-1 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  {regresando ? (
                    <i className="fas fa-spinner animate-spin" />
                  ) : (
                    <i className="fas fa-undo" />
                  )}
                  Regresar
                </button>
              </Tooltip>
            )}
            {onCancelarPedido && (
              <Tooltip content="Cancelar este pedido">
                <button
                  type="button"
                  onClick={handleCancelar}
                  disabled={cancelando}
                  className="flex-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded px-2 py-1 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  {cancelando ? (
                    <i className="fas fa-spinner animate-spin" />
                  ) : (
                    <i className="fas fa-times-circle" />
                  )}
                  Cancelar
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen === "entregar"}
        title="Confirmar entrega"
        message={`¿Confirmar la entrega del pedido ${pedido.numero_pedido} para ${pedido.cliente_nombre}?`}
        confirmLabel="Confirmar entrega"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={executeAvanzar}
        onCancel={() => setConfirmOpen(null)}
      />

      <ConfirmModal
        open={confirmOpen === "cancelar"}
        title="Cancelar pedido"
        message={`¿Estás seguro de cancelar el pedido ${pedido.numero_pedido} de ${pedido.cliente_nombre}? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="No cancelar"
        variant="danger"
        onConfirm={executeCancelar}
        onCancel={() => setConfirmOpen(null)}
      />

      <ConfirmModal
        open={confirmOpen === "regresar"}
        title="Regresar pedido"
        message={`¿Regresar el pedido ${pedido.numero_pedido} de ${pedido.cliente_nombre} al área anterior?`}
        confirmLabel="Sí, regresar"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={executeRegresar}
        onCancel={() => setConfirmOpen(null)}
      />
    </>
  );
}
