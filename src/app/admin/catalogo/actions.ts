"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin(): Promise<string> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("No autenticado");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "superadmin"].includes(profile.rol)) {
    throw new Error("No autorizado");
  }

  return user.id;
}

export async function crearAtributo(nombre: string) {
  await requireAdmin();
  const trimmed = nombre.trim();
  if (!trimmed) throw new Error("El nombre del atributo es obligatorio");

  const { data, error } = await createAdminClient()
    .from("atributos")
    .insert({ nombre: trimmed })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearValor(atributoId: string, valor: string) {
  await requireAdmin();
  const trimmed = valor.trim();
  if (!trimmed) throw new Error("El valor es obligatorio");

  const { error } = await createAdminClient()
    .from("atributo_valores")
    .insert({ atributo_id: atributoId, valor: trimmed });

  if (error && error.code !== "23505") throw new Error(error.message);
}

export async function toggleAtributoActivo(id: string, activo: boolean) {
  await requireAdmin();

  const { error } = await createAdminClient()
    .from("atributos")
    .update({ activo })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function eliminarAtributo(id: string) {
  await requireAdmin();

  const { error } = await createAdminClient()
    .from("atributos")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
