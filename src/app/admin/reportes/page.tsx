"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { PendientesTabla } from "./_components/PendientesTabla";
import { TiempoProduccion } from "./_components/TiempoProduccion";
import { KpisProduccion } from "./_components/KpisProduccion";
import { fetchKpisProduccion, type KpisProduccion as Kpis } from "@/lib/services/kpis";
import { construirResumenReporte, type PedidoReporte } from "@/lib/utils/reportes";
import type { Pedido } from "@/lib/supabase/types";

const VentasChart = dynamic(
  () => import("./_components/VentasChart").then((m) => ({ default: m.VentasChart })),
  { ssr: false, loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" /> },
);

const MetodoPagoChart = dynamic(
  () => import("./_components/MetodoPagoChart").then((m) => ({ default: m.MetodoPagoChart })),
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

interface TiempoRow {
  ruta: string;
  horas_promedio: number;
}

export default function ReportesPage() {
  const { showError } = useToast();
  const [periodo, setPeriodo] = useState<string>("30d");
  const [cargando, setCargando] = useState(true);
  const [ventas, setVentas] = useState<VentaDia[]>([]);
  const [cobrado, setCobrado] = useState<VentaDia[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPagoData[]>([]);
  const [resumen, setResumen] = useState<{
    totalVendido: number;
    totalCobrado: number;
    saldoPendiente: number;
  } | null>(null);
  const [pendientes, setPendientes] = useState<Pedido[]>([]);
  const [tiempos, setTiempos] = useState<TiempoRow[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);

  const periodoActual = PERIODOS.find((p) => p.key === periodo) ?? PERIODOS[2];
  const dias = periodoActual.days;

  useEffect(() => {
    const start = getStartDate(dias);

    async function cargar() {
      setCargando(true);
      try {
        const [pagosRes, pendientesRes, tiemposRes, kpisData] = await Promise.all([
          supabase
            .from("pedidos")
            .select(
              "fecha_recepcion, total, anticipo, metodo_pago, saldo_cobrado, saldo_metodo_pago, saldo_cobrado_en, estado",
            )
            .or(
              `fecha_recepcion.gte.${start},saldo_cobrado_en.gte.${start}T00:00:00`,
            )
            .order("fecha_recepcion"),
          supabase
            .from("pedidos")
            .select("*")
            .not("estado", "in", '("entregado","cancelado")')
            .order("fecha_entrega", { ascending: true })
            .order("hora_entrega", { ascending: true }),
          supabase.rpc("tiempo_produccion_promedio", { dias }),
          fetchKpisProduccion(dias).catch(() => null),
        ]);

        const resumenPagos = construirResumenReporte(
          (pagosRes.data ?? []) as PedidoReporte[],
          start,
        );
        setVentas(resumenPagos.ventasPorDia as VentaDia[]);
        setCobrado(resumenPagos.cobradoPorDia as VentaDia[]);
        setMetodosPago(resumenPagos.cobradoPorMetodo as MetodoPagoData[]);
        setResumen({
          totalVendido: resumenPagos.totalVendido,
          totalCobrado: resumenPagos.totalCobrado,
          saldoPendiente: resumenPagos.saldoPendiente,
        });

        if (pendientesRes.data) {
          setPendientes(pendientesRes.data as Pedido[]);
        }

        if (tiemposRes.data) {
          setTiempos(tiemposRes.data as TiempoRow[]);
        } else if (tiemposRes.error) {
          setTiempos([]);
        }

        setKpis(kpisData);
      } catch (err) {
        console.error("Error cargando reportes:", err);
        showError("Error al cargar reportes.");
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [periodo, dias, showError]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase">Reportes</h2>
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
        <div className="text-center text-gray-400 dark:text-gray-500 py-20">Cargando reportes...</div>
      ) : (
        <div className="space-y-6">
          {resumen && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Vendido
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  ${resumen.totalVendido.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Cobrado
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  ${resumen.totalCobrado.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Saldo pendiente
                </p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  ${resumen.saldoPendiente.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {kpis && (
              <div className="xl:col-span-2">
                <KpisProduccion data={kpis} />
              </div>
            )}
            <VentasChart
              data={ventas}
              titulo="Vendido por día"
              serieNombre="Vendido"
            />
            <VentasChart
              data={cobrado}
              titulo="Cobrado por día"
              serieNombre="Cobrado"
            />
            <MetodoPagoChart
              data={metodosPago}
              titulo="Cobrado por método"
            />
            <div className="xl:col-span-2">
              <PendientesTabla pedidos={pendientes} />
            </div>
            <div className="xl:col-span-2">
              <TiempoProduccion data={tiempos} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
