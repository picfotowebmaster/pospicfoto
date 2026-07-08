"use client";

import { Badge } from "@/components/ui/Badge";
import { ESTADOS_PEDIDO, AREAS_PRODUCCION_DATA } from "@/lib/utils/constantes";
import type { Pedido } from "@/lib/supabase/types";

interface Props {
  pedidos: Pedido[];
}

function formatearFecha(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function diasHasta(fechaEntrega: string): { dias: number; vencido: boolean } {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const entrega = new Date(fechaEntrega + "T00:00:00");
  const diff = Math.round((entrega.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return { dias: diff, vencido: diff < 0 };
}

export function PendientesTabla({ pedidos }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        Pendientes de entrega ({pedidos.length})
      </h3>
      {pedidos.length === 0 ? (
        <div className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">
          No hay pedidos pendientes
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                <th className="pb-2 pr-3">Pedido</th>
                <th className="pb-2 pr-3">Cliente</th>
                <th className="pb-2 pr-3">Entrega</th>
                <th className="pb-2 pr-3 text-center">Días</th>
                <th className="pb-2 pr-3">Área</th>
                <th className="pb-2 pr-3">Estado</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const { dias, vencido } = diasHasta(p.fecha_entrega);
                const area = AREAS_PRODUCCION_DATA.find((a) => a.id === p.area_actual);
                const estadoDef = ESTADOS_PEDIDO.find((e) => e.value === p.estado);

                return (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="py-2 pr-3 font-mono text-xs text-gray-500 dark:text-gray-400">{p.numero_pedido || "\u2014"}</td>
                    <td className="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100">{p.cliente_nombre}</td>
                    <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 text-xs">
                      {formatearFecha(p.fecha_entrega)} {p.hora_entrega?.slice(0, 5)}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                          vencido
                            ? "bg-red-100 text-red-700"
                            : dias <= 2
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {vencido ? `-${Math.abs(dias)}` : dias}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 text-xs">
                      {area?.nombre ?? p.area_actual}
                    </td>
                    <td className="py-2 pr-3">
                      {estadoDef && (
                        <Badge color={estadoDef.color}>{estadoDef.label}</Badge>
                      )}
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                      ${p.total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
