"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORES_PAGO: Record<string, string> = {
  Efectivo: "#10b981",
  Tarjeta: "#3b82f6",
  Transferencia: "#8b5cf6",
};

const COLOR_DEFAULT = "#9ca3af";

interface Props {
  data: { metodo_pago: string; count: number; total: number }[];
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(valor);
}

export function MetodoPagoChart({ data }: Props) {
  if (data.length === 0) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          Método de Pago
        </h3>
        <div className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">
          Sin datos en este período
        </div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.total, 0);

  const formatted = data.map((d) => ({
    name: d.metodo_pago,
    value: d.total,
    porcentaje: total > 0 ? ((d.total / total) * 100).toFixed(1) : "0",
    pedidos: d.count,
  }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        Método de Pago
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={formatted}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
          >
            {formatted.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORES_PAGO[entry.name] || COLOR_DEFAULT}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => (typeof value === "number" ? formatearMoneda(value) : value)}
            labelFormatter={(label) => {
              const name = typeof label === "string" ? label : String(label);
              const item = formatted.find((f) => f.name === name);
              return `${name} (${item?.porcentaje ?? "?"}%)`;
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
