import { supabase } from "../supabase/client";
import type { Sucursal } from "../supabase/types";

export async function listarSucursales(): Promise<Sucursal[]> {
  const { data, error } = await supabase
    .from("sucursales")
    .select("id, nombre, codigo")
    .order("nombre", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Sucursal[];
}

export function indexarSucursales(
  sucursales: Sucursal[],
): Map<string, string> {
  return new Map(sucursales.map((sucursal) => [sucursal.id, sucursal.nombre]));
}

export function nombreSucursal(
  id: string | null | undefined,
  nombres: Map<string, string>,
): string {
  if (!id) return "Sin sucursal";
  return nombres.get(id) ?? "Sin sucursal";
}
