import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const DIAS_EXPIRACION_ENLACE = 30;

const TOKEN_RE = /^[0-9a-f]{48}$/i;

export function esTokenValido(token: string): boolean {
  return TOKEN_RE.test(token);
}

export interface EnlaceCompartido {
  id: string;
  pedido_id: string;
  token: string;
  created_by: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

function generarToken(): string {
  return randomBytes(24).toString("hex");
}

function calcularExpiracion(ahora = new Date()): string {
  const fecha = new Date(ahora);
  fecha.setDate(fecha.getDate() + DIAS_EXPIRACION_ENLACE);
  return fecha.toISOString();
}

export function enlaceVigente(
  enlace: Pick<EnlaceCompartido, "revoked_at" | "expires_at">,
  ahora = new Date(),
): boolean {
  if (enlace.revoked_at) return false;
  if (enlace.expires_at && new Date(enlace.expires_at) <= ahora) return false;
  return true;
}

export async function crearOReutilizarEnlace(
  pedidoId: string,
  createdBy?: string | null,
): Promise<EnlaceCompartido> {
  const admin = createAdminClient();
  const ahora = new Date().toISOString();

  const { data: existente, error: errorConsulta } = await admin
    .from("enlaces_compartidos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .is("revoked_at", null)
    .gt("expires_at", ahora)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorConsulta) {
    throw new Error(
      `No se pudo consultar el enlace: ${errorConsulta.message}`,
    );
  }

  if (existente) return existente as EnlaceCompartido;

  const { data, error } = await admin
    .from("enlaces_compartidos")
    .insert({
      pedido_id: pedidoId,
      token: generarToken(),
      created_by: createdBy ?? null,
      expires_at: calcularExpiracion(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`No se pudo crear el enlace: ${error.message}`);
  }

  return data as EnlaceCompartido;
}

export async function obtenerEnlaceValido(
  token: string,
): Promise<EnlaceCompartido | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enlaces_compartidos")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar el enlace: ${error.message}`);
  }

  if (!data) return null;

  const enlace = data as EnlaceCompartido;
  return enlaceVigente(enlace) ? enlace : null;
}

export async function revocarEnlacesDePedido(pedidoId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("enlaces_compartidos")
    .update({ revoked_at: new Date().toISOString() })
    .eq("pedido_id", pedidoId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`No se pudo revocar el enlace: ${error.message}`);
  }
}
