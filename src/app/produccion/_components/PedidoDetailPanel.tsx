"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { fetchMovimientosByPedido } from "@/lib/services/workflow";
import { PedidoColaboracion } from "./PedidoColaboracion";
import { METODOS_PAGO } from "@/lib/utils/constantes";
import type { Pedido, PedidoMovimiento, PrioridadPedido, MetodoPago } from "@/lib/supabase/types";
import type { NextAreaInfo } from "./KanbanBoard";
import {
  getSlaLevel,
  getRutaLabel,
  formatAttrs,
  formatFechaEntrega,
} from "@/lib/utils/pedido";

const SLA_STYLES = {
  ok: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-300", label: "En tiempo" },
  warning: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", label: "Próximo a vencer" },
  danger: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Vencido" },
};

interface PedidoDetailPanelProps {
  pedido: Pedido | null;
  open: boolean;
  onClose: () => void;
  tiempoEnColumna?: string | null;
  areas?: { id: string; nombre: string }[];
  nextAreas?: NextAreaInfo[];
  onAvanzarPedido?: (pedidoId: string, destino?: string) => Promise<void>;
  usuarioId?: string | null;
  onCambiarPrioridad?: (pedidoId: string, prioridad: PrioridadPedido) => Promise<void>;
  onAsignar?: (pedidoId: string, usuarioId: string | null) => Promise<void>;
  onGuardarNotas?: (pedidoId: string, notas: string | null) => Promise<void>;
  onMarcarCorreccion?: (pedidoId: string, requiere: boolean, motivo: string | null) => Promise<void>;
  onLiquidarSaldo?: (pedidoId: string, metodo: MetodoPago) => Promise<void>;
}

export function PedidoDetailPanel({
  pedido,
  open,
  onClose,
  tiempoEnColumna,
  areas = [],
  nextAreas = [],
  onAvanzarPedido,
  usuarioId,
  onCambiarPrioridad,
  onAsignar,
  onGuardarNotas,
  onMarcarCorreccion,
  onLiquidarSaldo,
}: PedidoDetailPanelProps) {
  const [destino, setDestino] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [confirmarEntrega, setConfirmarEntrega] = useState(false);
  const [metodoSaldo, setMetodoSaldo] = useState<MetodoPago>("Efectivo");
  const [cobrando, setCobrando] = useState(false);
  const [historial, setHistorial] = useState<{
    id: string;
    movimientos: PedidoMovimiento[];
  } | null>(null);

  const pedidoId = pedido?.id;

  useEffect(() => {
    if (!pedidoId) return;
    let ignore = false;
    fetchMovimientosByPedido(pedidoId)
      .then((data) => {
        if (!ignore) setHistorial({ id: pedidoId, movimientos: data });
      })
      .catch(() => {
        if (!ignore) setHistorial({ id: pedidoId, movimientos: [] });
      });
    return () => {
      ignore = true;
    };
  }, [pedidoId]);

  if (!pedido) return null;

  const movimientos = historial && historial.id === pedidoId ? historial.movimientos : [];
  const cargandoHistorial = !!pedidoId && historial?.id !== pedidoId;

  const areaNombre = (id?: string | null) =>
    (id && areas.find((a) => a.id === id)?.nombre) || id || "—";

  const resta = pedido.total - pedido.anticipo;

  const sla = getSlaLevel(pedido.fecha_entrega, pedido.hora_entrega);
  const slaStyle = SLA_STYLES[sla];
  const lineas = pedido.detalle_pedidos ?? [];
  const totalItems = lineas.reduce((sum, l) => sum + l.cantidad, 0);
  const hasMultiple = nextAreas.some((next) => next.multiple);
  const esEntrega = nextAreas.length === 1 && nextAreas[0].destination === "entregado";
  const destinoSeleccionado = hasMultiple ? destino : nextAreas[0]?.destination;

  function ejecutarAvance() {
    if (!pedido || !onAvanzarPedido || !destinoSeleccionado) return;
    const pedidoActual = pedido;
    setConfirmarEntrega(false);
    setProcesando(true);
    onAvanzarPedido(pedidoActual.id, hasMultiple ? destinoSeleccionado : undefined)
      .then(onClose)
      .finally(() => {
        setProcesando(false);
        setDestino("");
      });
  }

  const fechaEntrega = formatFechaEntrega(pedido.fecha_entrega, pedido.hora_entrega, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-60 bg-black/30 dark:bg-black/50 transition-opacity animate-[fadeIn_150ms_ease-out]"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-60 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              {pedido.cliente_nombre}
            </h2>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500">
              {pedido.numero_pedido}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-60px)] p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded px-3 py-1 text-xs font-semibold ${slaStyle.bg} ${slaStyle.text}`}>
              <i className={`fas ${sla === "danger" ? "fa-exclamation-triangle" : sla === "warning" ? "fa-clock" : "fa-check-circle"} mr-1`} />
              {slaStyle.label}
            </span>
            {pedido.ruta && (
              <span className="rounded px-3 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <i className="fas fa-route mr-1" />
                {getRutaLabel(pedido.ruta)}
              </span>
            )}
            {pedido.requiere_correccion && (
              <span className="rounded px-3 py-1 text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                <i className="fas fa-triangle-exclamation mr-1" />
                Requiere corrección
              </span>
            )}
          </div>

          {onAvanzarPedido && nextAreas.length > 0 && (
            <div className="space-y-2">
              {hasMultiple && (
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Siguiente área
                  <select
                    value={destino}
                    onChange={(event) => setDestino(event.target.value)}
                    className="mt-1 w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecciona un destino...</option>
                    {nextAreas.map((next) => (
                      <option key={next.destination} value={next.destination}>
                        {areas.find((area) => area.id === next.destination)?.nombre || next.destination}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Button
                variant={esEntrega ? "success" : "primary"}
                size="sm"
                className="w-full"
                disabled={procesando || (hasMultiple && !destinoSeleccionado)}
                onClick={() => (esEntrega ? setConfirmarEntrega(true) : ejecutarAvance())}
              >
                {procesando ? <i className="fas fa-spinner animate-spin" /> : <i className={`fas ${esEntrega ? "fa-check-circle" : "fa-arrow-right"} mr-1`} />}
                {esEntrega ? "Entregar pedido" : "Avanzar pedido"}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                Entrega
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {fechaEntrega}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                Área actual
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {pedido.area_actual}
                {tiempoEnColumna && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                    · {tiempoEnColumna}
                  </span>
                )}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                Total items
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {totalItems} unidad{totalItems === 1 ? "" : "es"}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                Estado
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5 capitalize">
                {pedido.estado?.replace(/_/g, " ") || "Pendiente"}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <i className="fas fa-money-bill-wave text-gray-400" />
              Pago
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                  Total
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                  ${pedido.total.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                  Anticipo
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                  ${pedido.anticipo.toFixed(2)}
                </p>
              </div>
              <div
                className={`rounded-lg p-3 ${
                  resta > 0
                    ? "bg-amber-50 dark:bg-amber-900/30"
                    : "bg-green-50 dark:bg-green-900/30"
                }`}
              >
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                  Saldo
                </p>
                <p
                  className={`text-sm font-bold mt-0.5 ${
                    resta > 0
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  ${resta.toFixed(2)}
                </p>
              </div>
            </div>

            {resta > 0 && onLiquidarSaldo && (
              pedido.saldo_cobrado ? (
                <p className="mt-3 text-xs font-semibold text-green-700 dark:text-green-400 inline-flex items-center gap-1.5">
                  <i className="fas fa-check-circle" />
                  Saldo cobrado ({pedido.saldo_metodo_pago || "—"})
                </p>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={metodoSaldo}
                    onChange={(e) => setMetodoSaldo(e.target.value as MetodoPago)}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Método de cobro del saldo"
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="success"
                    className="flex-1"
                    disabled={cobrando}
                    onClick={async () => {
                      setCobrando(true);
                      try {
                        await onLiquidarSaldo(pedido.id, metodoSaldo);
                      } catch {
                        /* notificado en el hook */
                      } finally {
                        setCobrando(false);
                      }
                    }}
                  >
                    {cobrando ? (
                      <i className="fas fa-spinner animate-spin" />
                    ) : (
                      <i className="fas fa-hand-holding-dollar mr-1" />
                    )}
                    Registrar cobro ${resta.toFixed(2)}
                  </Button>
                </div>
              )
            )}
          </div>

          <PedidoColaboracion
            key={pedido.id}
            pedido={pedido}
            usuarioId={usuarioId}
            onCambiarPrioridad={onCambiarPrioridad}
            onAsignar={onAsignar}
            onGuardarNotas={onGuardarNotas}
            onMarcarCorreccion={onMarcarCorreccion}
          />

          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <i className="fas fa-clock-rotate-left text-gray-400" />
              Historial ({movimientos.length})
            </h3>
            {cargandoHistorial ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Cargando historial...</p>
            ) : movimientos.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Sin movimientos registrados.</p>
            ) : (
              <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-1.5 space-y-3">
                {movimientos.map((m) => (
                  <li key={m.id} className="ml-4">
                    <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {areaNombre(m.from_area)} → {areaNombre(m.to_area)}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {new Date(m.created_at).toLocaleString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <i className="fas fa-boxes text-gray-400" />
              Productos ({lineas.length})
            </h3>
            <div className="space-y-2">
              {lineas.map((l, i) => (
                <div
                  key={l.id || i}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {l.producto_nombre}
                    </span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full px-2 py-0.5">
                      x{l.cantidad}
                    </span>
                  </div>
                  {l.atributos && Object.keys(l.atributos).length > 0 && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      {formatAttrs(l.atributos)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmarEntrega}
        title="Confirmar entrega"
        message={`¿Confirmar la entrega del pedido ${pedido.numero_pedido} para ${pedido.cliente_nombre}?${resta > 0 && !pedido.saldo_cobrado ? ` Saldo pendiente por cobrar: $${resta.toFixed(2)}.` : ""}`}
        confirmLabel="Confirmar entrega"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={ejecutarAvance}
        onCancel={() => setConfirmarEntrega(false)}
      />
    </>
  );
}
