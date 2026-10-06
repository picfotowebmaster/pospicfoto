import { supabase } from "../supabase/client";
import type { Pedido } from "../supabase/types";
import {
  calcularTiempoPorEtapa,
  calcularSlaPedidos,
  contarReTrabajos,
  type MovimientoKpi,
  type TiempoEtapa,
} from "@/lib/utils/kpis";

export interface AccionOperario {
  operadorId: string;
  nombre: string;
  acciones: number;
}

export interface KpisProduccion {
  tiempoPorEtapa: TiempoEtapa[];
  total: number;
  vencidos: number;
  porcentajeVencidos: number;
  reTrabajos: number;
  accionesPorOperario: AccionOperario[];
}

export async function fetchKpisProduccion(dias: number): Promise<KpisProduccion> {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const startIso = desde.toISOString();

  const [pedidosRes, movRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, fecha_entrega, hora_entrega, requiere_correccion, motivo_correccion")
      .gte("created_at", startIso),
    supabase
      .from("pedido_movimientos")
      .select("pedido_id, from_area, to_area, operador_id, created_at")
      .gte("created_at", startIso),
  ]);

  if (pedidosRes.error) throw pedidosRes.error;
  if (movRes.error) throw movRes.error;

  const pedidos = (pedidosRes.data ?? []) as Pedido[];
  const movimientos = (movRes.data ?? []) as MovimientoKpi[];

  const conteo: Record<string, number> = {};
  for (const m of movimientos) {
    if (!m.operador_id) continue;
    conteo[m.operador_id] = (conteo[m.operador_id] ?? 0) + 1;
  }

  const idsOperarios = Object.keys(conteo);
  const nombres: Record<string, string> = {};
  if (idsOperarios.length > 0) {
    const { data: perfiles } = await supabase
      .from("profiles")
      .select("id, nombre")
      .in("id", idsOperarios);
    for (const p of (perfiles ?? []) as { id: string; nombre: string }[]) {
      nombres[p.id] = p.nombre;
    }
  }

  const accionesPorOperario: AccionOperario[] = Object.entries(conteo)
    .map(([operadorId, acciones]) => ({
      operadorId,
      nombre: nombres[operadorId] || operadorId.slice(0, 8),
      acciones,
    }))
    .sort((a, b) => b.acciones - a.acciones)
    .slice(0, 8);

  const sla = calcularSlaPedidos(pedidos);

  return {
    tiempoPorEtapa: calcularTiempoPorEtapa(movimientos),
    total: sla.total,
    vencidos: sla.vencidos,
    porcentajeVencidos: sla.porcentajeVencidos,
    reTrabajos: contarReTrabajos(pedidos),
    accionesPorOperario,
  };
}
