import { supabase } from "../supabase/client";
import type { Atributo, AtributoValor } from "../supabase/types";

export async function fetchAtributos(): Promise<Atributo[]> {
  const { data, error } = await supabase
    .from("atributos")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  if (error) throw error;
  return data;
}

export async function fetchValores(atributoId: string): Promise<AtributoValor[]> {
  const { data, error } = await supabase
    .from("atributo_valores")
    .select("*")
    .eq("atributo_id", atributoId)
    .order("valor");

  if (error) throw error;
  return data;
}

export async function fetchAtributosConValores(): Promise<
  (Atributo & { valores: AtributoValor[] })[]
> {
  const { data, error } = await supabase
    .from("atributos")
    .select("*, atributo_valores(*)")
    .eq("activo", true)
    .order("nombre");

  if (error) throw error;
  return data.map((a: Atributo & { atributo_valores: AtributoValor[] }) => ({
    ...a,
    valores: a.atributo_valores || [],
  }));
}

export async function insertAtributo(nombre: string) {
  const { data, error } = await supabase
    .from("atributos")
    .insert({ nombre })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertAtributoValor(atributoId: string, valor: string) {
  const { error } = await supabase
    .from("atributo_valores")
    .insert({ atributo_id: atributoId, valor });
  if (error && error.code !== "23505") throw error; // ignorar duplicados
}

export async function toggleAtributoActivo(id: string, activo: boolean) {
  const { error } = await supabase
    .from("atributos")
    .update({ activo })
    .eq("id", id);
  if (error) throw error;
}
