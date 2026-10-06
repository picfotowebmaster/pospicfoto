"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Pedido } from "@/lib/supabase/types";
import type { NextAreaInfo } from "./KanbanBoard";
import {
  getSlaLevel,
  getRutaLabel,
  formatFechaEntrega,
  formatRelativeDue,
  type SlaLevel,
} from "@/lib/utils/pedido";

const SLA_DOT = {
  ok: "bg-gray-400",
  warning: "bg-yellow-500",
  danger: "bg-red-500 animate-[wip-pulse_2s_ease-in-out_infinite]",
};

const SLA_RANK: Record<SlaLevel, number> = { danger: 0, warning: 1, ok: 2 };

type OrdenKey = "entrega" | "sla" | "cliente";

interface KanbanListViewProps {
  columnas: Record<string, Pedido[]>;
  areas: { id: string; nombre: string; color: string; orden: number }[];
  getNextForPedido: (pedido: Pedido) => NextAreaInfo[];
  onAvanzarPedido: (pedidoId: string, destino?: string) => Promise<void>;
  onCancelarPedido?: (pedidoId: string) => Promise<void>;
  onRegresarPedido?: (pedidoId: string) => Promise<void>;
  getTiempoEnColumna?: (pedidoId: string) => string | null;
  getTiempoEnColumnaNivel?: (pedidoId: string) => SlaLevel | null;
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

const AGING_TEXT: Record<SlaLevel, string> = {
  ok: "text-gray-400 dark:text-gray-500",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400 font-semibold",
};

export function KanbanListView({
  columnas,
  areas,
  getNextForPedido,
  onAvanzarPedido,
  onCancelarPedido,
  onRegresarPedido,
  getTiempoEnColumna,
  getTiempoEnColumnaNivel,
  onClickDetalle,
  areaFiltro,
}: KanbanListViewProps) {
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [destinos, setDestinos] = useState<Record<string, string>>({});
  const [orden, setOrden] = useState<OrdenKey>("entrega");
  const [confirmar, setConfirmar] = useState<{ tipo: "entregar" | "cancelar" | "regresar"; pedido: Pedido } | null>(null);

  const areasFiltradas = areas.filter((a) => {
    if (a.id === "entregado") return false;
    if (areaFiltro && a.id !== areaFiltro) return false;
    return true;
  });

  const todosLosPedidos = useMemo(() => {
    const lista = areasFiltradas.flatMap((a) =>
      (columnas[a.id] || []).map((p) => ({ ...p, _area: a }))
    );
    lista.sort((a, b) => {
      const pa = a.prioridad === "urgente" ? 0 : 1;
      const pb = b.prioridad === "urgente" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (orden === "cliente") {
        return a.cliente_nombre.localeCompare(b.cliente_nombre);
      }
      if (orden === "sla") {
        const sa = getSlaLevel(a.fecha_entrega, a.hora_entrega);
        const sb = getSlaLevel(b.fecha_entrega, b.hora_entrega);
        return SLA_RANK[sa] - SLA_RANK[sb];
      }
      const fa = `${a.fecha_entrega}T${a.hora_entrega}`;
      const fb = `${b.fecha_entrega}T${b.hora_entrega}`;
      return fa.localeCompare(fb);
    });
    return lista;
  }, [columnas, areasFiltradas, orden]);

  if (todosLosPedidos.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <i className="fas fa-inbox text-4xl text-gray-200 dark:text-gray-700" />
        <p className="text-gray-400 dark:text-gray-500">No hay pedidos que mostrar.</p>
      </div>
    );
  }

  function ejecutarAvance(pedido: Pedido, hasMultiple: boolean, destinoSeleccionado?: string) {
    setProcesandoId(pedido.id);
    onAvanzarPedido(pedido.id, hasMultiple ? destinoSeleccionado : undefined)
      .catch(() => {})
      .finally(() => {
        setProcesandoId(null);
        setDestinos((current) => ({ ...current, [pedido.id]: "" }));
      });
  }

  function ejecutarConfirmado() {
    if (!confirmar) return;
    const { tipo, pedido } = confirmar;
    setConfirmar(null);
    setProcesandoId(pedido.id);
    const accion =
      tipo === "cancelar"
        ? onCancelarPedido?.(pedido.id)
        : tipo === "regresar"
          ? onRegresarPedido?.(pedido.id)
          : onAvanzarPedido(pedido.id);
    Promise.resolve(accion)
      .catch(() => {})
      .finally(() => setProcesandoId(null));
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {todosLosPedidos.length} pedidos
        </span>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          Ordenar por
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as OrdenKey)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="entrega">Fecha de entrega</option>
            <option value="sla">Urgencia (SLA)</option>
            <option value="cliente">Cliente</option>
          </select>
        </label>
      </div>

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
          const tiempoNivel = getTiempoEnColumnaNivel?.(pedido.id) ?? "ok";
          const fechaEntrega = formatFechaEntrega(pedido.fecha_entrega, pedido.hora_entrega);
          const relativa = formatRelativeDue(pedido.fecha_entrega, pedido.hora_entrega);
          const dotColor = COLOR_DOT[pedido._area.color] || "bg-gray-500";
          const procesando = procesandoId === pedido.id;

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
                  {pedido.prioridad === "urgente" && (
                    <i className="fas fa-flag text-red-500 mr-1" title="Prioritario" />
                  )}
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
                  {pedido.ruta ? getRutaLabel(pedido.ruta) : "-"}
                </span>
              </div>
              <div className="col-span-1">
                <span className="text-xs text-gray-600 dark:text-gray-300 block">{fechaEntrega}</span>
                <span className={`text-[10px] ${sla === "danger" ? "text-red-600 dark:text-red-400" : sla === "warning" ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}>
                  {relativa}
                </span>
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
                <span className={`text-[11px] ${AGING_TEXT[tiempoNivel]}`}>
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
                    disabled={procesando || (hasMultiple && !destinoSeleccionado)}
                    onClick={() => {
                      if (esEntrega) {
                        setConfirmar({ tipo: "entregar", pedido });
                        return;
                      }
                      ejecutarAvance(pedido, hasMultiple, destinoSeleccionado);
                    }}
                    className="shrink-0"
                    title={esEntrega ? "Entregar" : `Avanzar a ${destinoNombre || "siguiente área"}`}
                  >
                    {procesando ? <i className="fas fa-spinner animate-spin" /> : <i className={`fas ${esEntrega ? "fa-check" : "fa-arrow-right"}`} />}
                    <span className="sr-only">{esEntrega ? "Entregar" : `Avanzar a ${destinoNombre || "siguiente área"}`}</span>
                  </Button>
                ) : (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">Sin acción</span>
                )}
                {onRegresarPedido && (
                  <button
                    type="button"
                    title="Regresar al área anterior"
                    aria-label={`Regresar el pedido ${pedido.numero_pedido || pedido.cliente_nombre}`}
                    disabled={procesando}
                    onClick={() => setConfirmar({ tipo: "regresar", pedido })}
                    className="shrink-0 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded p-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <i className="fas fa-undo" />
                  </button>
                )}
                {onCancelarPedido && (
                  <button
                    type="button"
                    title="Cancelar pedido"
                    aria-label={`Cancelar el pedido ${pedido.numero_pedido || pedido.cliente_nombre}`}
                    disabled={procesando}
                    onClick={() => setConfirmar({ tipo: "cancelar", pedido })}
                    className="shrink-0 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded p-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <i className="fas fa-times-circle" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={confirmar?.tipo === "entregar"}
        title="Confirmar entrega"
        message={`¿Confirmar la entrega del pedido ${confirmar?.pedido.numero_pedido} para ${confirmar?.pedido.cliente_nombre}?${
          confirmar && confirmar.pedido.total - confirmar.pedido.anticipo > 0 && !confirmar.pedido.saldo_cobrado
            ? ` Saldo pendiente por cobrar: $${(confirmar.pedido.total - confirmar.pedido.anticipo).toFixed(2)}.`
            : ""
        }`}
        confirmLabel="Confirmar entrega"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={ejecutarConfirmado}
        onCancel={() => setConfirmar(null)}
      />
      <ConfirmModal
        open={confirmar?.tipo === "regresar"}
        title="Regresar pedido"
        message={`¿Regresar el pedido ${confirmar?.pedido.numero_pedido} de ${confirmar?.pedido.cliente_nombre} al área anterior?`}
        confirmLabel="Sí, regresar"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={ejecutarConfirmado}
        onCancel={() => setConfirmar(null)}
      />
      <ConfirmModal
        open={confirmar?.tipo === "cancelar"}
        title="Cancelar pedido"
        message={`¿Estás seguro de cancelar el pedido ${confirmar?.pedido.numero_pedido} de ${confirmar?.pedido.cliente_nombre}? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="No cancelar"
        variant="danger"
        onConfirm={ejecutarConfirmado}
        onCancel={() => setConfirmar(null)}
      />
    </div>
  );
}
