import { getSlaLevel } from "./pedido";
import type { Pedido } from "@/lib/supabase/types";

export interface MovimientoKpi {
  pedido_id: string;
  from_area: string;
  to_area: string;
  operador_id: string | null;
  created_at: string;
}

export interface TiempoEtapa {
  area: string;
  horas: number;
  muestras: number;
}

export function calcularTiempoPorEtapa(
  movimientos: MovimientoKpi[],
): TiempoEtapa[] {
  const porPedido: Record<string, MovimientoKpi[]> = {};
  for (const m of movimientos) {
    if (!porPedido[m.pedido_id]) porPedido[m.pedido_id] = [];
    porPedido[m.pedido_id].push(m);
  }

  const acc: Record<string, { sum: number; n: number }> = {};

  for (const lista of Object.values(porPedido)) {
    const orden = [...lista].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    for (let i = 0; i < orden.length - 1; i++) {
      const area = orden[i].to_area;
      const delta =
        new Date(orden[i + 1].created_at).getTime() -
        new Date(orden[i].created_at).getTime();
      if (delta < 0) continue;
      if (!acc[area]) acc[area] = { sum: 0, n: 0 };
      acc[area].sum += delta;
      acc[area].n += 1;
    }
  }

  return Object.entries(acc)
    .map(([area, v]) => ({
      area,
      horas: v.n > 0 ? v.sum / v.n / 3_600_000 : 0,
      muestras: v.n,
    }))
    .sort((a, b) => b.horas - a.horas);
}

export function calcularSlaPedidos(pedidos: Pedido[]): {
  total: number;
  vencidos: number;
  porcentajeVencidos: number;
} {
  let vencidos = 0;
  for (const p of pedidos) {
    if (getSlaLevel(p.fecha_entrega, p.hora_entrega) === "danger") vencidos++;
  }
  const total = pedidos.length;
  return {
    total,
    vencidos,
    porcentajeVencidos: total > 0 ? (vencidos / total) * 100 : 0,
  };
}

export function contarReTrabajos(pedidos: Pedido[]): number {
  return pedidos.filter(
    (p) =>
      p.requiere_correccion ||
      (typeof p.motivo_correccion === "string" && p.motivo_correccion.trim() !== ""),
  ).length;
}
