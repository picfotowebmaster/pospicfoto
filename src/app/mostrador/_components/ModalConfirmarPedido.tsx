"use client";

import { Button } from "@/components/ui/Button";
import { RUTAS_PRODUCCION } from "@/lib/utils/constantes";
import type { LineaPedidoDraft, MetodoPago } from "@/lib/supabase/types";

interface ModalConfirmarPedidoProps {
  open: boolean;
  clienteNombre: string;
  telefono: string;
  fechaEntrega: string;
  horaEntrega: string;
  lineas: LineaPedidoDraft[];
  subtotal: number;
  anticipo: number;
  total: number;
  metodoPago: MetodoPago;
  cargando: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ModalConfirmarPedido({
  open,
  clienteNombre,
  telefono,
  fechaEntrega,
  horaEntrega,
  lineas,
  subtotal,
  anticipo,
  total,
  metodoPago,
  cargando,
  onConfirm,
  onCancel,
}: ModalConfirmarPedidoProps) {
  if (!open) return null;

  const saldo = total - anticipo;
  const fecha = fechaEntrega
    ? new Date(`${fechaEntrega}T${horaEntrega || "00:00"}`).toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-[fadeIn_150ms_ease-out]">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Confirmar pedido
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Revisa antes de cobrar y generar el ticket
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            aria-label="Cerrar"
          >
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                Cliente
              </p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{clienteNombre}</p>
              {telefono && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{telefono}</p>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
                Entrega
              </p>
              <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{fecha}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
              Productos ({lineas.length})
            </h3>
            <div className="space-y-1.5">
              {lineas.map((l, i) => {
                const rutaLabel = RUTAS_PRODUCCION.find((r) => r.value === l.ruta);
                const attrs = Object.entries(l.atributos || {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ");
                return (
                  <div
                    key={l.id || i}
                    className="flex items-start justify-between gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {l.cantidad}x {l.producto_nombre}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {rutaLabel?.label || l.ruta}
                        {attrs ? ` · ${attrs}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 shrink-0">
                      ${(l.cantidad * l.precio_unitario).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Anticipo ({metodoPago})</span>
              <span>${anticipo.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-1.5">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-amber-700 dark:text-amber-300">
              <span>Saldo pendiente al entregar</span>
              <span>${saldo.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={cargando}>
            <i className="fas fa-arrow-left mr-1" />
            Volver a editar
          </Button>
          <Button variant="success" onClick={onConfirm} disabled={cargando}>
            {cargando ? (
              <span className="inline-flex items-center gap-1">
                <i className="fas fa-spinner animate-spin" />
                Procesando...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <i className="fas fa-check-circle" />
                Confirmar y cobrar
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
