import { supabase } from "../supabase/client";
import type { ProductoHistorial } from "../supabase/types";

export async function buscarHistorial(termino: string): Promise<ProductoHistorial[]> {
  if (termino.length < 2) return [];
  const { data, error } = await supabase
    .from("productos_historial")
    .select("*")
    .ilike("nombre", `%${termino}%`)
    .order("veces_usado", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}

export async function upsertHistorial(
  nombre: string,
  atributos: Record<string, string>,
): Promise<ProductoHistorial> {
  const { data: existing, error: searchErr } = await supabase
    .from("productos_historial")
    .select("*")
    .eq("nombre", nombre)
    .maybeSingle();

  if (searchErr) throw searchErr;

  if (existing) {
    const { data, error } = await supabase
      .from("productos_historial")
      .update({
        atributos,
        veces_usado: existing.veces_usado + 1,
        ultimo_uso: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("productos_historial")
    .insert({ nombre, atributos, veces_usado: 1 })
    .select()
    .single();

  if (error) throw error;
  return data;
}
