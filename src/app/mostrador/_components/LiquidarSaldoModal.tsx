"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { METODOS_PAGO } from "@/lib/utils/constantes";
import type { MetodoPago } from "@/lib/supabase/types";

interface LiquidarSaldoModalProps {
  numeroPedido?: string | null;
  clienteNombre: string;
  saldo: number;
  onConfirm: (metodo: MetodoPago) => Promise<void>;
  onClose: () => void;
}

export function LiquidarSaldoModal({
  numeroPedido,
  clienteNombre,
  saldo,
  onConfirm,
  onClose,
}: LiquidarSaldoModalProps) {
  const [metodo, setMetodo] = useState<MetodoPago>("Efectivo");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setProcesando(true);
    setError("");
    try {
      await onConfirm(metodo);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al liquidar el saldo.",
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Liquidar saldo
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {numeroPedido ? `${numeroPedido} · ` : ""}
              {clienteNombre}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            aria-label="Cerrar"
          >
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
              Saldo a cobrar
            </p>
            <p className="text-3xl font-bold text-amber-700 mt-1">
              ${saldo.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Método de pago
            </label>
            <div className="flex gap-2">
              {METODOS_PAGO.map((m) => (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => setMetodo(m.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border font-medium transition-colors cursor-pointer ${
                    metodo === m.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Se registrará el saldo y el ticket mostrará el pago completo con el
            mismo número de pedido.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleConfirm}
            disabled={procesando}
          >
            {procesando ? (
              <span className="inline-flex items-center gap-1">
                <i className="fas fa-spinner animate-spin" />
                Liquidando...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <i className="fas fa-hand-holding-dollar" />
                Liquidar ${saldo.toFixed(2)}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
