import { supabase } from "../supabase/client";
import type { Marca } from "../supabase/types";

export async function listarMarcas(): Promise<Marca[]> {
  const { data, error } = await supabase
    .from("marcas")
    .select("id, nombre, codigo")
    .order("nombre", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Marca[];
}

export function indexarMarcas(marcas: Marca[]): Map<string, string> {
  return new Map(marcas.map((marca) => [marca.id, marca.nombre]));
}

export function nombreMarca(
  id: string | null | undefined,
  nombres: Map<string, string>,
): string {
  if (!id) return "Sin marca";
  return nombres.get(id) ?? "Sin marca";
}
