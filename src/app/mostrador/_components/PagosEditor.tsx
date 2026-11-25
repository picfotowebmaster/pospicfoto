"use client";

import { Button } from "@/components/ui/Button";
import { METODOS_PAGO } from "@/lib/utils/constantes";
import { redondear2, sumarPagos, TOLERANCIA_PAGO } from "@/lib/utils/pagos";
import type { MetodoPago, PagoDraft } from "@/lib/supabase/types";

interface PagosEditorProps {
  pagos: PagoDraft[];
  total: number;
  onChange: (pagos: PagoDraft[]) => void;
  disabled?: boolean;
}

export function PagosEditor({
  pagos,
  total,
  onChange,
  disabled = false,
}: PagosEditorProps) {
  const suma = sumarPagos(pagos);
  const restante = redondear2(total - suma);
  const cuadrado = Math.abs(restante) <= TOLERANCIA_PAGO;

  function actualizar(index: number, cambios: Partial<PagoDraft>) {
    onChange(pagos.map((pago, i) => (i === index ? { ...pago, ...cambios } : pago)));
  }

  function agregar() {
    const metodo = METODOS_PAGO.find(
      (m) => !pagos.some((p) => p.metodo === m.value),
    )?.value ?? pagos[0]?.metodo ?? "Efectivo";
    onChange([...pagos, { metodo, monto: Math.max(0, restante) }]);
  }

  function quitar(index: number) {
    if (pagos.length <= 1) {
      onChange(pagos.map((pago, i) => (i === index ? { ...pago, monto: 0 } : pago)));
      return;
    }
    onChange(pagos.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {pagos.map((pago, index) => (
        <div key={index} className="flex items-center gap-2">
          <select
            value={pago.metodo}
            onChange={(e) =>
              actualizar(index, { metodo: e.target.value as MetodoPago })
            }
            disabled={disabled}
            aria-label={`Método de pago ${index + 1}`}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {METODOS_PAGO.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="relative w-28">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              $
            </span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={pago.monto || ""}
              onChange={(e) => actualizar(index, { monto: Number(e.target.value) })}
              disabled={disabled}
              aria-label={`Monto de pago ${index + 1}`}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-5 pr-2 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => quitar(index)}
            disabled={disabled}
            aria-label={`Quitar pago ${index + 1}`}
            className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"
          >
            <i className="fas fa-times" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={agregar}
          disabled={disabled}
        >
          <i className="fas fa-plus mr-1" />
          Agregar método
        </Button>
        <span
          className={`text-xs font-semibold ${
            cuadrado
              ? "text-green-600 dark:text-green-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {cuadrado
            ? `Cuadra: $${suma.toFixed(2)}`
            : restante > 0
              ? `Falta: $${restante.toFixed(2)}`
              : `Excede: $${Math.abs(restante).toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
