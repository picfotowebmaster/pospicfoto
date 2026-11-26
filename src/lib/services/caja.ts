import { supabase } from "../supabase/client";
import type { RangoReporte } from "../utils/reportesContables";

export async function obtenerCobradoEfectivoCaja(
  rango: RangoReporte,
  sucursalId?: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc("cobrado_efectivo_caja", {
    p_desde: rango.desde,
    p_hasta: rango.hasta,
    p_sucursal_id: sucursalId ?? null,
  });

  if (error) throw error;

  return Number(data ?? 0);
}
