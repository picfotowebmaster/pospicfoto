"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type UsuarioRow = {
  id: string;
  email: string | undefined;
  nombre: string | null;
  rol: string | null;
  creado: string | undefined;
  ultimoLogin: string | undefined;
};

export async function listarUsuarios(): Promise<UsuarioRow[]> {
  const client = createAdminClient();

  const { data: usersData, error: usersError } =
    await client.auth.admin.listUsers();

  if (usersError) throw new Error(usersError.message);

  const { data: profiles } = await client.from("profiles").select("*");
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return (usersData?.users || []).map((user) => ({
    id: user.id,
    email: user.email,
    nombre: profileMap.get(user.id)?.nombre || null,
    rol: profileMap.get(user.id)?.rol || null,
    creado: user.created_at,
    ultimoLogin: user.last_sign_in_at,
  }));
}

export async function resetPassword(userId: string, newPassword: string) {
  const client = createAdminClient();

  const { error } = await client.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) throw new Error(error.message);

  return { success: true };
}
