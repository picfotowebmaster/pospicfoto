"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { fecha_recepcion: string; count: number; total: number }[];
}

function formatearFecha(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(valor);
}

export function VentasChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Ventas
        </h3>
        <div className="text-center text-gray-400 py-10 text-sm">
          Sin datos en este período
        </div>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    fecha: formatearFecha(d.fecha_recepcion),
  }));

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Ventas por día
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip
            formatter={(value, name) => {
              if (name === "Ingresos" && typeof value === "number") return formatearMoneda(value);
              return value;
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="count" name="Pedidos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="total" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
