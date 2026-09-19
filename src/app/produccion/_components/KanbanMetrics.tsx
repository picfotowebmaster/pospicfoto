"use client";

import React, { useMemo } from "react";
import { StatsSkeleton } from "@/components/ui/Skeleton";
import type { Pedido } from "@/lib/supabase/types";

function getSlaLevel(fechaEntrega: string, horaEntrega: string): "ok" | "warning" | "danger" {
  const due = new Date(`${fechaEntrega}T${horaEntrega}`).getTime();
  const now = Date.now();
  const diffMs = due - now;
  if (diffMs < 0) return "danger";
  if (diffMs < 24 * 60 * 60 * 1000) return "warning";
  return "ok";
}

interface MetricsData {
  totalPedidos: number;
  pedidosVencidos: number;
  pedidosProximos: number;
  pedidosEnTiempo: number;
  columnas: Record<string, Pedido[]>;
  areas: { id: string; nombre: string }[];
}

interface KanbanMetricsProps {
  data: MetricsData;
  loading?: boolean;
}

export function KanbanMetrics({ data, loading }: KanbanMetricsProps) {
  if (loading) return <StatsSkeleton />;

  if (data.totalPedidos === 0) return null;

  const areaConMasPedidos = useMemo(() => {
    let max = { id: "", nombre: "", count: 0 };
    for (const area of data.areas) {
      const count = (data.columnas[area.id] || []).length;
      if (count > max.count) max = { id: area.id, nombre: area.nombre, count };
    }
    return max;
  }, [data.columnas, data.areas]);

  const pedestalesVencidosPorArea = useMemo(() => {
    const result: { id: string; nombre: string; vencidos: number }[] = [];
    for (const area of data.areas) {
      const pedidos = data.columnas[area.id] || [];
      const vencidos = pedidos.filter((p) => getSlaLevel(p.fecha_entrega, p.hora_entrega) === "danger").length;
      if (vencidos > 0) result.push({ id: area.id, nombre: area.nombre, vencidos });
    }
    result.sort((a, b) => b.vencidos - a.vencidos);
    return result;
  }, [data.columnas, data.areas]);

  const metrics = [
    {
      label: "Total pedidos",
      value: data.totalPedidos,
      sub: "activos en pipeline",
      icon: "fa-clipboard-list",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "Vencidos",
      value: data.pedidosVencidos,
      sub: data.pedidosVencidos > 0 ? "atención requerida" : "al día",
      icon: "fa-exclamation-triangle",
      color: data.pedidosVencidos > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500",
      bg: data.pedidosVencidos > 0 ? "bg-red-50 dark:bg-red-900/30" : "bg-gray-50 dark:bg-gray-800",
      pulse: data.pedidosVencidos > 0,
    },
    {
      label: "Próximos a vencer",
      value: data.pedidosProximos,
      sub: "en las próximas 24h",
      icon: "fa-clock",
      color: data.pedidosProximos > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500",
      bg: data.pedidosProximos > 0 ? "bg-amber-50 dark:bg-amber-900/30" : "bg-gray-50 dark:bg-gray-800",
    },
    {
      label: "Cuello de botella",
      value: areaConMasPedidos.count,
      sub: areaConMasPedidos.nombre || "N/A",
      icon: "fa-chart-bar",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/30",
    },
  ];

  return (
    <div className="space-y-3 mb-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`${m.bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 transition-all duration-200 hover:shadow-sm`}
          >
            <div className="flex items-center gap-2 mb-2">
              <i className={`fas ${m.icon} ${m.color} text-sm ${m.pulse ? "animate-[wip-pulse_2s_ease-in-out_infinite]" : ""}`} />
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                {m.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{m.sub}</p>
          </div>
        ))}
      </div>

      {pedestalesVencidosPorArea.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 animate-[slideInUp_150ms_ease-out]">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
            <i className="fas fa-exclamation-triangle" />
            Pedidos vencidos por área
          </p>
          <div className="flex flex-wrap gap-2">
            {pedestalesVencidosPorArea.map((a) => (
              <span
                key={a.id}
                className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-white dark:bg-red-900/40 rounded-full px-2.5 py-1"
              >
                {a.nombre}: {a.vencidos}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function computeMetrics(columnas: Record<string, Pedido[]>, areas: { id: string; nombre: string }[]) {
  let totalPedidos = 0;
  let pedidosVencidos = 0;
  let pedidosProximos = 0;
  let pedidosEnTiempo = 0;

  for (const pedidos of Object.values(columnas)) {
    for (const p of pedidos) {
      totalPedidos++;
      const sla = getSlaLevel(p.fecha_entrega, p.hora_entrega);
      if (sla === "danger") pedidosVencidos++;
      else if (sla === "warning") pedidosProximos++;
      else pedidosEnTiempo++;
    }
  }

  return {
    totalPedidos,
    pedidosVencidos,
    pedidosProximos,
    pedidosEnTiempo,
    columnas,
    areas,
  };
}
