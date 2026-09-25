"use server";

import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

const ROLES_ASIGNABLES = [
  "mostrador",
  "diseno",
  "impresion",
  "laminado",
  "montaje",
  "books",
  "bastidores",
  "marcos",
  "taller",
  "corte",
  "admin",
  "superadmin",
  "contador",
] as const;

async function obtenerPerfilAutenticado(): Promise<{ id: string; rol: string }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("No autenticado");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("No autorizado");

  return { id: user.id, rol: profile.rol };
}

async function requireAdmin(): Promise<string> {
  const { id, rol } = await obtenerPerfilAutenticado();
  if (!["admin", "superadmin"].includes(rol)) {
    throw new Error("No autorizado");
  }
  return id;
}

async function requireSuperadmin(): Promise<string> {
  const { id, rol } = await obtenerPerfilAutenticado();
  if (rol !== "superadmin") {
    throw new Error("No autorizado");
  }
  return id;
}

export type UsuarioRow = {
  id: string;
  email: string | undefined;
  nombre: string | null;
  rol: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  creado: string | undefined;
  ultimoLogin: string | undefined;
};

export async function listarUsuarios(): Promise<UsuarioRow[]> {
  await requireAdmin();

  const client = createAdminClient();

  const { data: usersData, error: usersError } =
    await client.auth.admin.listUsers();

  if (usersError) throw new Error(usersError.message);

  const { data: profiles } = await client.from("profiles").select("*");
  const { data: sucursales } = await client.from("sucursales").select("id, nombre");

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  const sucursalMap = new Map((sucursales || []).map((s) => [s.id, s.nombre]));

  return (usersData?.users || []).map((user) => {
    const profile = profileMap.get(user.id);
    return {
      id: user.id,
      email: user.email,
      nombre: profile?.nombre || null,
      rol: profile?.rol || null,
      sucursal_id: profile?.sucursal_id || null,
      sucursal_nombre: profile?.sucursal_id ? sucursalMap.get(profile.sucursal_id) || null : null,
      creado: user.created_at,
      ultimoLogin: user.last_sign_in_at,
    };
  });
}

export async function resetPassword(userId: string, newPassword: string) {
  await requireAdmin();

  const client = createAdminClient();

  const { error } = await client.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function updateUserSucursal(userId: string, sucursalId: string | null) {
  await requireAdmin();

  const client = createAdminClient();

  const { error } = await client
    .from("profiles")
    .update({ sucursal_id: sucursalId || null })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function updateUserRol(userId: string, rol: string) {
  const currentUserId = await requireSuperadmin();

  if (userId === currentUserId) {
    throw new Error("No puedes cambiar tu propio rol.");
  }

  if (!ROLES_ASIGNABLES.includes(rol as (typeof ROLES_ASIGNABLES)[number])) {
    throw new Error("Rol inválido.");
  }

  const client = createAdminClient();

  const { error } = await client
    .from("profiles")
    .update({ rol })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function createUser(email: string, password: string, nombre: string, rol: string, sucursal_id?: string) {
  await requireAdmin();

  const client = createAdminClient();

  const { data: created, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (error) throw new Error(error.message);

  if (created?.user) {
    const updateData: Record<string, unknown> = { rol, nombre };
    if (sucursal_id) updateData.sucursal_id = sucursal_id;
    await client.from("profiles").update(updateData).eq("id", created.user.id);
  }

  return { success: true };
}
