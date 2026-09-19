"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

const VentasChart = dynamic(
  () => import("@/app/admin/reportes/_components/VentasChart").then((m) => ({ default: m.VentasChart })),
  { ssr: false, loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> },
);

const MetodoPagoChart = dynamic(
  () => import("@/app/admin/reportes/_components/MetodoPagoChart").then((m) => ({ default: m.MetodoPagoChart })),
  { ssr: false, loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> },
);

const PERIODOS = [
  { key: "today", label: "Hoy", days: 1 },
  { key: "7d", label: "7 días", days: 7 },
  { key: "30d", label: "30 días", days: 30 },
  { key: "month", label: "Este mes", days: 0 },
  { key: "90d", label: "3 meses", days: 90 },
] as const;

function getStartDate(days: number): string {
  if (days === 0) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

interface VentaDia {
  fecha_recepcion: string;
  count: number;
  total: number;
}

interface MetodoPagoData {
  metodo_pago: string;
  count: number;
  total: number;
}

export default function ReportesContabilidadPage() {
  const { showError } = useToast();
  const [periodo, setPeriodo] = useState<string>("30d");
  const [cargando, setCargando] = useState(true);
  const [ventas, setVentas] = useState<VentaDia[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPagoData[]>([]);

  const periodoActual = PERIODOS.find((p) => p.key === periodo) ?? PERIODOS[2];
  const dias = periodoActual.days;

  useEffect(() => {
    const start = getStartDate(dias);

    async function cargar() {
      setCargando(true);
      try {
        const [ventasRes, metodosRes] = await Promise.all([
          supabase
            .from("pedidos")
            .select("fecha_recepcion, total")
            .gte("fecha_recepcion", start)
            .order("fecha_recepcion"),
          supabase
            .from("pedidos")
            .select("metodo_pago, total")
            .gte("fecha_recepcion", start),
        ]);

        if (ventasRes.data) {
          const agrupado: Record<string, { count: number; total: number }> = {};
          for (const row of ventasRes.data as { fecha_recepcion: string; total: number }[]) {
            const d = row.fecha_recepcion;
            if (!agrupado[d]) agrupado[d] = { count: 0, total: 0 };
            agrupado[d].count++;
            agrupado[d].total += row.total ?? 0;
          }
          setVentas(
            Object.entries(agrupado).map(([fecha, val]) => ({
              fecha_recepcion: fecha,
              count: val.count,
              total: val.total,
            })),
          );
        }

        if (metodosRes.data) {
          const agrupado: Record<string, MetodoPagoData> = {};
          for (const row of metodosRes.data as { metodo_pago: string; total: number }[]) {
            const m = row.metodo_pago;
            if (!agrupado[m]) agrupado[m] = { metodo_pago: m, count: 0, total: 0 };
            agrupado[m].count++;
            agrupado[m].total += row.total ?? 0;
          }
          setMetodosPago(Object.values(agrupado));
        }
      } catch (err) {
        console.error("Error cargando reportes:", err);
        showError("Error al cargar reportes.");
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [periodo, dias]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase">
          Reportes contables
        </h2>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              type="button"
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                periodo === p.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="text-center text-gray-400 dark:text-gray-500 py-20">
          Cargando reportes...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <VentasChart data={ventas} />
          <MetodoPagoChart data={metodosPago} />
        </div>
      )}
    </div>
  );
}
