"use server";

import { createAdminClient } from "@/lib/supabase/admin";

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
  const client = createAdminClient();

  const { error } = await client.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function createUser(email: string, password: string, nombre: string, rol: string, sucursal_id?: string) {
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
