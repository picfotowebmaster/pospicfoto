"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import type { MetodoPago } from "@/lib/supabase/types";
import {
  ANTICIPO_POR_DEFECTO,
  ANTICIPO_OPCIONES,
  METODOS_PAGO,
} from "@/lib/utils/constantes";

interface ResumenPagoProps {
  subtotal: number;
  anticipo: number;
  total: number;
  porcentajeAnticipo: number;
  metodoPago: MetodoPago;
  onPorcentajeChange: (p: number) => void;
  onMetodoPagoChange: (m: MetodoPago) => void;
}

export function ResumenPago({
  subtotal,
  anticipo,
  total,
  porcentajeAnticipo,
  metodoPago,
  onPorcentajeChange,
  onMetodoPagoChange,
}: ResumenPagoProps) {
  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Resumen y Pago
      </h3>

      <div className="flex gap-2">
        {ANTICIPO_OPCIONES.map((op) => (
          <button
            key={op.value}
            onClick={() => onPorcentajeChange(op.value)}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border font-medium transition-colors cursor-pointer ${
              porcentajeAnticipo === op.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Anticipo ({porcentajeAnticipo}%)</span>
          <span className="font-bold text-blue-600">${anticipo.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-1.5">
          <span className="text-gray-700 font-semibold">Total</span>
          <span className="text-lg font-bold">${total.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Método de Pago
        </label>
        <div className="flex gap-2">
          {METODOS_PAGO.map((m) => (
            <button
              key={m.value}
              onClick={() => onMetodoPagoChange(m.value)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border font-medium transition-colors cursor-pointer ${
                metodoPago === m.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
