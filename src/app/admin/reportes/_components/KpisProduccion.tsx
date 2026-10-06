"use client";

import { nombreArea } from "@/lib/utils/notificaciones";
import type { KpisProduccion as Kpis } from "@/lib/services/kpis";

interface Props {
  data: Kpis;
  loading?: boolean;
}

function formatearHoras(horas: number): string {
  if (horas <= 0) return "—";
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function KpisProduccion({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const maxHoras = Math.max(1, ...data.tiempoPorEtapa.map((t) => t.horas));
  const maxAcciones = Math.max(1, ...data.accionesPorOperario.map((o) => o.acciones));
  const vencidosPct = data.porcentajeVencidos;

  const cards = [
    {
      label: "Pedidos",
      value: String(data.total),
      sub: "en el período",
      icon: "fa-clipboard-list",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/30",
    },
    {
      label: "% Vencidos",
      value: `${vencidosPct.toFixed(0)}%`,
      sub: `${data.vencidos} de ${data.total}`,
      icon: "fa-exclamation-triangle",
      color: vencidosPct > 20 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400",
      bg: vencidosPct > 20 ? "bg-red-50 dark:bg-red-900/30" : "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Re-trabajos",
      value: String(data.reTrabajos),
      sub: "con corrección",
      icon: "fa-rotate-left",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-900/30",
    },
    {
      label: "Etapas medidas",
      value: String(data.tiempoPorEtapa.length),
      sub: "con tiempo promedio",
      icon: "fa-stopwatch",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/30",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`${c.bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700/50`}
          >
            <div className="flex items-center gap-2 mb-2">
              <i className={`fas ${c.icon} ${c.color} text-sm`} />
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                {c.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Tiempo promedio por etapa
          </h3>
          {data.tiempoPorEtapa.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
              Sin datos de movimientos en el período.
            </p>
          ) : (
            <div className="space-y-3">
              {data.tiempoPorEtapa.map((t) => (
                <div key={t.area}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-300">{nombreArea(t.area)}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {formatearHoras(t.horas)}
                      <span className="text-gray-400 font-normal ml-1">({t.muestras})</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.max(4, (t.horas / maxHoras) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Acciones por operario
          </h3>
          {data.accionesPorOperario.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
              Sin movimientos registrados en el período.
            </p>
          ) : (
            <div className="space-y-3">
              {data.accionesPorOperario.map((o) => (
                <div key={o.operadorId}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-300 truncate">{o.nombre}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{o.acciones}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.max(4, (o.acciones / maxAcciones) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
