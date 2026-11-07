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

const ROLES_CON_ENTIDAD = ["mostrador", "admin", "superadmin"] as const;

export type UsuarioRow = {
  id: string;
  email: string | undefined;
  nombre: string | null;
  rol: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  entidad_emisora_id: string | null;
  entidad_emisora_nombre: string | null;
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
  const { data: entidades } = await client
    .from("entidades_emisoras")
    .select("id, nombre_comercial");

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  const sucursalMap = new Map((sucursales || []).map((s) => [s.id, s.nombre]));
  const entidadMap = new Map(
    (entidades || []).map((e) => [e.id, e.nombre_comercial]),
  );

  return (usersData?.users || []).map((user) => {
    const profile = profileMap.get(user.id);
    return {
      id: user.id,
      email: user.email,
      nombre: profile?.nombre || null,
      rol: profile?.rol || null,
      sucursal_id: profile?.sucursal_id || null,
      sucursal_nombre: profile?.sucursal_id ? sucursalMap.get(profile.sucursal_id) || null : null,
      entidad_emisora_id: profile?.entidad_emisora_id || null,
      entidad_emisora_nombre: profile?.entidad_emisora_id
        ? entidadMap.get(profile.entidad_emisora_id) || null
        : null,
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

async function obtenerEntidadEmisora(
  client: ReturnType<typeof createAdminClient>,
  entidadId: string,
) {
  const { data, error } = await client
    .from("entidades_emisoras")
    .select("id, sucursal_id, activo")
    .eq("id", entidadId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || !data.activo) {
    throw new Error("La entidad emisora no existe o está inactiva.");
  }
  return data;
}

export async function updateUserEntidad(
  userId: string,
  entidadEmisoraId: string | null,
) {
  await requireSuperadmin();

  const client = createAdminClient();

  if (!entidadEmisoraId) {
    const { error } = await client
      .from("profiles")
      .update({ entidad_emisora_id: null, sucursal_id: null })
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  const entidad = await obtenerEntidadEmisora(client, entidadEmisoraId);

  const { error } = await client
    .from("profiles")
    .update({
      entidad_emisora_id: entidadEmisoraId,
      sucursal_id: entidad.sucursal_id || null,
    })
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

export async function createUser(
  email: string,
  password: string,
  nombre: string,
  rol: string,
  entidadEmisoraId?: string,
) {
  await requireSuperadmin();

  if (!ROLES_ASIGNABLES.includes(rol as (typeof ROLES_ASIGNABLES)[number])) {
    throw new Error("Rol inválido.");
  }

  const requiereEntidad = ROLES_CON_ENTIDAD.includes(
    rol as (typeof ROLES_CON_ENTIDAD)[number],
  );

  if (requiereEntidad && !entidadEmisoraId) {
    throw new Error(
      "Debes asignar una razón social / sucursal para este rol.",
    );
  }

  const client = createAdminClient();
  const entidad = entidadEmisoraId
    ? await obtenerEntidadEmisora(client, entidadEmisoraId)
    : null;

  const { data: created, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (error) throw new Error(error.message);

  if (created?.user) {
    const updateData: Record<string, unknown> = {
      rol,
      nombre,
      entidad_emisora_id: entidad?.id || null,
      sucursal_id: entidad?.sucursal_id || null,
    };

    const { error: profileError } = await client
      .from("profiles")
      .update(updateData)
      .eq("id", created.user.id);

    if (profileError) {
      await client.auth.admin.deleteUser(created.user.id).catch(() => {});
      throw new Error(profileError.message);
    }
  }

  return { success: true };
}
