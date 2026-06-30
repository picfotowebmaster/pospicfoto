"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { VentasChart } from "./_components/VentasChart";
import { MetodoPagoChart } from "./_components/MetodoPagoChart";
import { PendientesTabla } from "./_components/PendientesTabla";
import { TiempoProduccion } from "./_components/TiempoProduccion";
import type { Pedido } from "@/lib/supabase/types";

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

interface TiempoRow {
  ruta: string;
  horas_promedio: number;
}

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<string>("30d");
  const [cargando, setCargando] = useState(true);
  const [ventas, setVentas] = useState<VentaDia[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPagoData[]>([]);
  const [pendientes, setPendientes] = useState<Pedido[]>([]);
  const [tiempos, setTiempos] = useState<TiempoRow[]>([]);

  const periodoActual = PERIODOS.find((p) => p.key === periodo) ?? PERIODOS[2];
  const dias = periodoActual.days;

  useEffect(() => {
    const start = getStartDate(dias);

    async function cargar() {
      setCargando(true);
      try {
        const [ventasRes, metodosRes, pendientesRes, tiemposRes] = await Promise.all([
          supabase
            .from("pedidos")
            .select("fecha_recepcion, total")
            .gte("fecha_recepcion", start)
            .order("fecha_recepcion"),
          supabase
            .from("pedidos")
            .select("metodo_pago, total")
            .gte("fecha_recepcion", start),
          supabase
            .from("pedidos")
            .select("*")
            .not("estado", "in", '("entregado","cancelado")')
            .order("fecha_entrega", { ascending: true })
            .order("hora_entrega", { ascending: true }),
          supabase.rpc("tiempo_produccion_promedio", { dias }),
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

        if (pendientesRes.data) {
          setPendientes(pendientesRes.data as Pedido[]);
        }

        if (tiemposRes.data) {
          setTiempos(tiemposRes.data as TiempoRow[]);
        } else if (tiemposRes.error) {
          setTiempos([]);
        }
      } catch (err) {
        console.error("Error cargando reportes:", err);
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [periodo, dias]);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Reportes</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                periodo === p.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="text-center text-gray-400 py-20">Cargando reportes...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <VentasChart data={ventas} />
          <MetodoPagoChart data={metodosPago} />
          <div className="xl:col-span-2">
            <PendientesTabla pedidos={pendientes} />
          </div>
          <div className="xl:col-span-2">
            <TiempoProduccion data={tiempos} />
          </div>
        </div>
      )}
    </div>
  );
}
