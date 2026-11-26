import { supabase } from "../supabase/client";
import type { GastoCaja } from "../supabase/types";
import type { RangoReporte } from "../utils/reportesContables";

const CAMPOS =
  "id, sucursal_id, concepto, categoria, monto, fecha, registrado_por, created_at, anulado, anulado_por, anulado_en, registrado:profiles!gastos_caja_registrado_por_fkey(nombre)";

interface GastoCajaRow extends Omit<GastoCaja, "registrado_por_nombre"> {
  registrado?: { nombre: string | null } | { nombre: string | null }[] | null;
}

function normalizar(row: GastoCajaRow): GastoCaja {
  const registrado = Array.isArray(row.registrado)
    ? row.registrado[0]
    : row.registrado;

  return {
    ...row,
    monto: Number(row.monto),
    registrado_por_nombre: registrado?.nombre ?? null,
  };
}

export async function listarGastosCaja(
  rango: RangoReporte,
  sucursalId?: string | null,
): Promise<GastoCaja[]> {
  let consulta = supabase
    .from("gastos_caja")
    .select(CAMPOS)
    .gte("fecha", rango.desde)
    .lte("fecha", rango.hasta);

  if (sucursalId) {
    consulta = consulta.eq("sucursal_id", sucursalId);
  }

  const { data, error } = await consulta.order("fecha", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as GastoCajaRow[]).map(normalizar);
}

export interface NuevoGastoCaja {
  sucursal_id: string;
  concepto: string;
  categoria: string | null;
  monto: number;
  fecha: string;
}

export async function crearGastoCaja(gasto: NuevoGastoCaja): Promise<void> {
  const { error } = await supabase.from("gastos_caja").insert({
    sucursal_id: gasto.sucursal_id,
    concepto: gasto.concepto.trim(),
    categoria: gasto.categoria,
    monto: gasto.monto,
    fecha: gasto.fecha,
  });

  if (error) throw error;
}

export async function anularGastoCaja(id: string): Promise<void> {
  const { error } = await supabase.rpc("anular_gasto_caja", { p_id: id });

  if (error) throw error;
}
