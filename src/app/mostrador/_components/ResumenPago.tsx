"use client";

import React from "react";
import type { MetodoPago, PagoDraft } from "@/lib/supabase/types";
import { ANTICIPO_OPCIONES, METODOS_PAGO } from "@/lib/utils/constantes";
import { PagosEditor } from "./PagosEditor";

interface ResumenPagoProps {
  subtotal: number;
  anticipo: number;
  total: number;
  porcentajeAnticipo: number;
  anticipoManual: number | null;
  esAnticipoManual: boolean;
  metodoPago: MetodoPago;
  pagosAnticipo: PagoDraft[];
  dividirPago: boolean;
  onPorcentajeChange: (p: number) => void;
  onUsarMontoManual: () => void;
  onAnticipoManualChange: (monto: number) => void;
  onMetodoPagoChange: (m: MetodoPago) => void;
  onPagosChange: (pagos: PagoDraft[]) => void;
  onActivarPagoDividido: () => void;
  onDesactivarPagoDividido: () => void;
}

export function ResumenPago({
  subtotal,
  anticipo,
  total,
  porcentajeAnticipo,
  anticipoManual,
  esAnticipoManual,
  metodoPago,
  pagosAnticipo,
  dividirPago,
  onPorcentajeChange,
  onUsarMontoManual,
  onAnticipoManualChange,
  onMetodoPagoChange,
  onPagosChange,
  onActivarPagoDividido,
  onDesactivarPagoDividido,
}: ResumenPagoProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-4">
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
        Resumen y Pago
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {ANTICIPO_OPCIONES.map((op) => (
          <button
            type="button"
            key={op.value}
            onClick={() => onPorcentajeChange(op.value)}
            className={`px-3 py-2 text-sm rounded-lg border font-medium transition-colors cursor-pointer ${
              !esAnticipoManual && porcentajeAnticipo === op.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            }`}
          >
            {op.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onUsarMontoManual}
          className={`col-span-2 px-3 py-2 text-sm rounded-lg border font-medium transition-colors cursor-pointer ${
            esAnticipoManual
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          }`}
        >
          Otro monto
        </button>
      </div>

      {esAnticipoManual && (
        <div>
          <label
            htmlFor="anticipo-manual"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Monto del anticipo
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              $
            </span>
            <input
              id="anticipo-manual"
              type="number"
              min={0}
              max={subtotal}
              step={0.01}
              value={anticipoManual ? anticipoManual : ""}
              placeholder="0.00"
              onChange={(e) => {
                const valor = e.target.value === "" ? 0 : Number(e.target.value);
                onAnticipoManualChange(
                  Math.min(Math.max(valor, 0), subtotal),
                );
              }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-7 pr-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Máximo ${subtotal.toFixed(2)}
          </p>
        </div>
      )}

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">
            Anticipo{" "}
            {esAnticipoManual ? "(monto libre)" : `(${porcentajeAnticipo}%)`}
            {dividirPago ? " · dividido" : ""}
          </span>
          <span className="font-bold text-blue-600">${anticipo.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-1.5">
          <span className="text-gray-700 font-semibold">Total</span>
          <span className="text-lg font-bold">${total.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-500">
            Método de Pago
          </label>
          {anticipo > 0 && (
            <button
              type="button"
              onClick={
                dividirPago ? onDesactivarPagoDividido : onActivarPagoDividido
              }
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
            >
              {dividirPago ? "Usar un solo método" : "Dividir pago"}
            </button>
          )}
        </div>

        {anticipo === 0 ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Sin cobro inicial. El método de pago se elige al cobrar el saldo en
            la entrega.
          </p>
        ) : dividirPago ? (
          <PagosEditor
            pagos={pagosAnticipo}
            total={anticipo}
            onChange={onPagosChange}
          />
        ) : (
          <div className="flex gap-2 flex-wrap">
            {METODOS_PAGO.map((m) => (
              <button
                type="button"
                key={m.value}
                onClick={() => onMetodoPagoChange(m.value)}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border font-medium transition-colors cursor-pointer ${
                  metodoPago === m.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
