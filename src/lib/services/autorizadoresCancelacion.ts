import { createAdminClient } from "@/lib/supabase/admin";

export interface AutorizadorCancelacion {
  id: string;
  nombre: string | null;
  email: string;
  rol: string;
}

export const ROLES_AUTORIZADORES_CANCELACION = ["admin", "superadmin"];

export async function listarAutorizadoresCancelacion(): Promise<
  AutorizadorCancelacion[]
> {
  const admin = createAdminClient();

  const { data: perfiles, error } = await admin
    .from("profiles")
    .select("id, nombre, rol")
    .in("rol", ROLES_AUTORIZADORES_CANCELACION);

  if (error) throw error;
  if (!perfiles || perfiles.length === 0) return [];

  const resultados = await Promise.all(
    perfiles.map(async (perfil) => {
      const { data, error: userError } = await admin.auth.admin.getUserById(
        perfil.id,
      );

      if (userError) {
        console.warn(
          `No se pudo obtener el correo del administrador ${perfil.id}:`,
          userError.message,
        );
        return null;
      }

      const email = data.user?.email?.trim();
      if (!email) return null;

      return {
        id: perfil.id,
        nombre: perfil.nombre ?? null,
        email,
        rol: perfil.rol,
      } satisfies AutorizadorCancelacion;
    }),
  );

  const vistos = new Set<string>();
  const autorizadores: AutorizadorCancelacion[] = [];

  for (const item of resultados) {
    if (!item) continue;

    const clave = item.email.toLowerCase();
    if (vistos.has(clave)) continue;

    vistos.add(clave);
    autorizadores.push(item);
  }

  return autorizadores.sort((a, b) => {
    const nombreA = a.nombre || a.email;
    const nombreB = b.nombre || b.email;
    return nombreA.localeCompare(nombreB, "es", { sensitivity: "base" });
  });
}

export async function obtenerAutorizadorPorId(
  id: string,
): Promise<AutorizadorCancelacion | null> {
  const admin = createAdminClient();

  const { data: perfil, error } = await admin
    .from("profiles")
    .select("id, nombre, rol")
    .eq("id", id)
    .in("rol", ROLES_AUTORIZADORES_CANCELACION)
    .maybeSingle();

  if (error) throw error;
  if (!perfil) return null;

  const { data, error: userError } = await admin.auth.admin.getUserById(
    perfil.id,
  );

  if (userError) throw userError;

  const email = data.user?.email?.trim();
  if (!email) return null;

  return {
    id: perfil.id,
    nombre: perfil.nombre ?? null,
    email,
    rol: perfil.rol,
  };
}
