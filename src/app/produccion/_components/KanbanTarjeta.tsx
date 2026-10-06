"use client";

import React, { useState, useMemo, useRef, useEffect, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Tooltip } from "@/components/ui/Tooltip";
import { useCoarsePointer } from "@/lib/hooks/useCoarsePointer";
import type { Pedido, PrioridadPedido } from "@/lib/supabase/types";
import type { NextAreaInfo } from "./KanbanBoard";
import { setKanbanDrag } from "./kanbanDrag";
import {
  getSlaLevel,
  getRutaLabel,
  formatAttrs,
  formatFechaEntrega,
  formatRelativeDue,
  type SlaLevel,
} from "@/lib/utils/pedido";

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

const AGING_TEXT: Record<SlaLevel, string> = {
  ok: "text-gray-400 dark:text-gray-500",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400 font-semibold",
};

interface KanbanTarjetaProps {
  pedido: Pedido;
  nextAreas: NextAreaInfo[];
  onAvanzarPedido: (pedidoId: string, destino?: string) => Promise<void>;
  onCancelarPedido?: (pedidoId: string) => Promise<void>;
  onRegresarPedido?: (pedidoId: string) => Promise<void>;
  tiempoEnColumna?: string | null;
  tiempoEnColumnaNivel?: SlaLevel | null;
  usuarioId?: string | null;
  onCambiarPrioridad?: (pedidoId: string, prioridad: PrioridadPedido) => Promise<void>;
  onAsignar?: (pedidoId: string, usuarioId: string | null) => Promise<void>;
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
  tiempoEnColumnaNivel,
  usuarioId,
  onCambiarPrioridad,
  onAsignar,
  modoSeleccion,
  isSelected,
  onToggleSeleccion,
  onClickDetalle,
}: KanbanTarjetaProps) {
  const [cambiando, setCambiando] = useState(false);
  const [destino, setDestino] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [regresando, setRegresando] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<"cancelar" | "regresar" | "entregar" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const coarsePointer = useCoarsePointer();

  const lineas = pedido.detalle_pedidos ?? [];
  const hasMultiple = nextAreas.some((n) => n.multiple);
  const puedeAvanzar = nextAreas.length > 0;
  const esEntrega = nextAreas.length === 1 && nextAreas[0].destination === "entregado";
  const destinoSeleccionado = hasMultiple ? destino : nextAreas[0]?.destination;
  const totalItems = lineas.reduce((sum, l) => sum + l.cantidad, 0);
  const saldo = pedido.total - pedido.anticipo;
  const resumenLineas = lineas
    .slice(0, 2)
    .map((l) => `${l.cantidad}x ${l.producto_nombre}`)
    .join(" · ");

  const sla = useMemo(
    () => getSlaLevel(pedido.fecha_entrega, pedido.hora_entrega),
    [pedido.fecha_entrega, pedido.hora_entrega],
  );

  const slaBadge = SLA_BADGE[sla];
  const esUrgente = pedido.prioridad === "urgente";
  const asignadoAMi = !!usuarioId && pedido.asignado_a === usuarioId;
  const asignado = !!pedido.asignado_a;

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
    } catch {
      /* el error ya se notifica en el hook */
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
    } catch {
      /* el error ya se notifica en el hook */
    } finally {
      setCambiando(false);
      setDestino("");
    }
  }

  async function executeCancelar() {
    setConfirmOpen(null);
    setMenuOpen(false);
    setCancelando(true);
    try {
      await onCancelarPedido?.(pedido.id);
    } catch {
      /* el error ya se notifica en el hook */
    } finally {
      setCancelando(false);
    }
  }

  async function executeRegresar() {
    setConfirmOpen(null);
    setMenuOpen(false);
    setRegresando(true);
    try {
      await onRegresarPedido?.(pedido.id);
    } catch {
      /* el error ya se notifica en el hook */
    } finally {
      setRegresando(false);
    }
  }

  async function ejecutarPrioridad() {
    if (!onCambiarPrioridad) return;
    setAccionando(true);
    try {
      await onCambiarPrioridad(pedido.id, esUrgente ? "normal" : "urgente");
      setMenuOpen(false);
    } catch {
      /* el error ya se notifica en el hook */
    } finally {
      setAccionando(false);
    }
  }

  async function ejecutarAsignacion() {
    if (!onAsignar || !usuarioId) return;
    setAccionando(true);
    try {
      await onAsignar(pedido.id, asignadoAMi ? null : usuarioId);
      setMenuOpen(false);
    } catch {
      /* el error ya se notifica en el hook */
    } finally {
      setAccionando(false);
    }
  }

  function handleDragStart(e: DragEvent) {
    if (modoSeleccion || coarsePointer) {
      e.preventDefault();
      return;
    }
    const destinos = nextAreas.map((n) => n.destination);
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        pedidoId: pedido.id,
        hasMultiple,
        fromArea: pedido.area_actual,
        validDestinations: destinos,
      }),
    );
    e.dataTransfer.effectAllowed = "move";
    setKanbanDrag({
      pedidoId: pedido.id,
      hasMultiple,
      fromArea: pedido.area_actual,
      destinations: nextAreas,
    });
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(cardRef.current, e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  function handleDragEnd() {
    setKanbanDrag(null);
  }

  const fechaEntrega = formatFechaEntrega(pedido.fecha_entrega, pedido.hora_entrega);
  const entregaRelativa = formatRelativeDue(pedido.fecha_entrega, pedido.hora_entrega);
  const tieneMenu = Boolean(
    onClickDetalle ||
      pedido.numero_pedido ||
      onRegresarPedido ||
      onCancelarPedido ||
      onCambiarPrioridad ||
      (onAsignar && usuarioId),
  );

  return (
    <>
      <div
        ref={cardRef}
        draggable={!modoSeleccion && !coarsePointer}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        role={!modoSeleccion && onClickDetalle ? "button" : undefined}
        tabIndex={!modoSeleccion && onClickDetalle ? 0 : undefined}
        onClick={() => {
          if (!modoSeleccion && onClickDetalle) onClickDetalle();
        }}
        onKeyDown={(e) => {
          if (modoSeleccion) return;
          if ((e.key === "Enter" || e.key === " ") && onClickDetalle) {
            e.preventDefault();
            onClickDetalle();
          }
        }}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 ${SLA_BORDER[sla]} p-3 space-y-2 transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${modoSeleccion ? "" : coarsePointer ? "" : "hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]"} ${isSelected ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {modoSeleccion && onToggleSeleccion && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSeleccion(pedido.id);
                }}
                className="cursor-pointer rounded"
                aria-label={`Seleccionar ${pedido.numero_pedido || pedido.cliente_nombre}`}
              />
            )}
            {pedido.numero_pedido && (
              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">
                {pedido.numero_pedido}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {esUrgente && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white">
                PRIORITARIO
              </span>
            )}
            {slaBadge.label && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${slaBadge.bg} ${slaBadge.text}`}>
                {sla === "danger" ? "URGENTE" : slaBadge.label}
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate block">
            {pedido.cliente_nombre}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            {pedido.ruta && (
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5">
                {getRutaLabel(pedido.ruta)}
              </span>
            )}
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{fechaEntrega}</span>
            <span className={`text-[10px] font-medium ${sla === "danger" ? "text-red-600 dark:text-red-400" : sla === "warning" ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}>
              {entregaRelativa}
            </span>
            {asignado && (
              <span className={`text-[10px] rounded px-1.5 py-0.5 inline-flex items-center gap-0.5 ${asignadoAMi ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                <i className="fas fa-user" />
                {asignadoAMi ? "Tú" : "Asignado"}
              </span>
            )}
          </div>
        </div>

        {tiempoEnColumna && (
          <Tooltip content="Tiempo en esta área">
            <div className={`text-[10px] inline-flex items-center gap-1 ${AGING_TEXT[tiempoEnColumnaNivel ?? "ok"]}`}>
              <i className="fas fa-clock" />
              {tiempoEnColumna}
              {(tiempoEnColumnaNivel === "danger" || tiempoEnColumnaNivel === "warning") && (
                <i className="fas fa-triangle-exclamation" />
              )}
            </div>
          </Tooltip>
        )}

        <div className="text-sm text-gray-700 dark:text-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{totalItems} unidad{totalItems === 1 ? "" : "es"}</span>
            {saldo > 0 && (
              <Tooltip content="Saldo pendiente de cobro">
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded px-1.5 py-0.5">
                  Saldo ${saldo.toFixed(2)}
                </span>
              </Tooltip>
            )}
            {pedido.requiere_correccion && (
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-900/30 rounded px-1.5 py-0.5">
                Corrección
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
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
              aria-expanded={expanded}
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

        {!modoSeleccion && (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {hasMultiple && puedeAvanzar && (
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                aria-label="Destino"
              >
                <option value="">Destino...</option>
                {nextAreas.map((n) => (
                  <option key={n.destination} value={n.destination}>
                    {n.destination}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2">
              {puedeAvanzar && (
                <Button
                  variant={esEntrega ? "success" : "primary"}
                  size={coarsePointer ? "md" : "sm"}
                  className={`flex-1 transition-all duration-200 ${coarsePointer ? "py-2.5" : ""}`}
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
              )}

              {tieneMenu && (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="h-full px-2 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    aria-label="Más acciones"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <i className="fas fa-ellipsis-vertical" />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 bottom-full mb-1 z-30 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm animate-[slideInUp_120ms_ease-out]"
                    >
                      {onCambiarPrioridad && (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={accionando}
                          onClick={ejecutarPrioridad}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          <i className={`fas ${esUrgente ? "fa-flag" : "fa-flag-checkered"} w-4 ${esUrgente ? "text-red-500" : "text-gray-400"}`} />
                          {esUrgente ? "Quitar prioritario" : "Marcar prioritario"}
                        </button>
                      )}
                      {onAsignar && usuarioId && (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={accionando}
                          onClick={ejecutarAsignacion}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          <i className={`fas ${asignadoAMi ? "fa-user-minus" : "fa-user-plus"} w-4 text-gray-400`} />
                          {asignadoAMi ? "Liberar pedido" : "Asignarme"}
                        </button>
                      )}
                      {onClickDetalle && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            onClickDetalle();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer inline-flex items-center gap-2"
                        >
                          <i className="fas fa-up-right-and-down-left-from-center w-4 text-gray-400" />
                          Ver detalle
                        </button>
                      )}
                      {pedido.numero_pedido && (
                        <a
                          role="menuitem"
                          href={`/mostrador/ticket/${pedido.numero_pedido || pedido.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMenuOpen(false)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer inline-flex items-center gap-2"
                        >
                          <i className="fas fa-receipt w-4 text-gray-400" />
                          Ver ticket
                        </a>
                      )}
                      {onRegresarPedido && (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={regresando}
                          onClick={() => setConfirmOpen("regresar")}
                          className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          <i className={`fas ${regresando ? "fa-spinner animate-spin" : "fa-undo"} w-4`} />
                          Regresar
                        </button>
                      )}
                      {onCancelarPedido && (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={cancelando}
                          onClick={() => setConfirmOpen("cancelar")}
                          className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          <i className={`fas ${cancelando ? "fa-spinner animate-spin" : "fa-times-circle"} w-4`} />
                          Cancelar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen === "entregar"}
        title="Confirmar entrega"
        message={`¿Confirmar la entrega del pedido ${pedido.numero_pedido} para ${pedido.cliente_nombre}?${saldo > 0 && !pedido.saldo_cobrado ? ` Saldo pendiente por cobrar: $${saldo.toFixed(2)}.` : ""}`}
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
