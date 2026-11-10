"use server";

import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import type { EntidadEmisora } from "@/lib/supabase/types";

async function requireSuperadmin(): Promise<string> {
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

  if (!profile || profile.rol !== "superadmin") {
    throw new Error("No autorizado");
  }

  return user.id;
}

export interface EntidadFiscal extends EntidadEmisora {
  marca_nombre: string | null;
  sucursal_nombre: string | null;
}

export interface EntidadFiscalInput {
  nombre_comercial: string;
  razon_social: string;
  rfc: string;
  regimen_fiscal: string;
  direccion: string;
  telefonos: string | null;
  email: string | null;
  sitio_web: string | null;
  logo_url: string | null;
  cp_expedicion: string;
  serie_factura: string | null;
  facturacion_key: string;
  activo: boolean;
}

export async function listarEntidadesFiscales(): Promise<EntidadFiscal[]> {
  await requireSuperadmin();

  const client = createAdminClient();
  const { data: entidades, error } = await client
    .from("entidades_emisoras")
    .select("*")
    .order("orden", { ascending: true });

  if (error) throw new Error(error.message);

  const [{ data: marcas }, { data: sucursales }] = await Promise.all([
    client.from("marcas").select("id, nombre"),
    client.from("sucursales").select("id, nombre"),
  ]);

  const marcaMap = new Map((marcas || []).map((m) => [m.id, m.nombre]));
  const sucursalMap = new Map(
    (sucursales || []).map((s) => [s.id, s.nombre]),
  );

  return ((entidades || []) as EntidadEmisora[]).map((entidad) => ({
    ...entidad,
    marca_nombre: entidad.marca_id
      ? marcaMap.get(entidad.marca_id) || null
      : null,
    sucursal_nombre: entidad.sucursal_id
      ? sucursalMap.get(entidad.sucursal_id) || null
      : null,
  }));
}

function textoRequerido(valor: string, campo: string): string {
  const limpio = valor.trim();
  if (!limpio) throw new Error(`${campo} es obligatorio.`);
  return limpio;
}

function textoOpcional(valor: string | null): string | null {
  const limpio = (valor ?? "").trim();
  return limpio === "" ? null : limpio;
}

export async function actualizarEntidadFiscal(
  id: string,
  datos: EntidadFiscalInput,
) {
  await requireSuperadmin();

  if (!id) throw new Error("Entidad inválida.");

  const facturacionKey = datos.facturacion_key.trim().toUpperCase();
  if (!["PIC", "FRX"].includes(facturacionKey)) {
    throw new Error("La clave de facturación debe ser PIC o FRX.");
  }

  const update = {
    nombre_comercial: textoRequerido(
      datos.nombre_comercial,
      "El nombre comercial",
    ),
    razon_social: textoRequerido(datos.razon_social, "La razón social"),
    rfc: textoRequerido(datos.rfc, "El RFC").toUpperCase(),
    regimen_fiscal: textoRequerido(
      datos.regimen_fiscal,
      "El régimen fiscal",
    ),
    direccion: textoRequerido(datos.direccion, "La dirección"),
    telefonos: textoOpcional(datos.telefonos),
    email: textoOpcional(datos.email),
    sitio_web: textoOpcional(datos.sitio_web),
    logo_url: textoOpcional(datos.logo_url),
    cp_expedicion: textoRequerido(datos.cp_expedicion, "El código postal"),
    serie_factura: textoOpcional(datos.serie_factura),
    facturacion_key: facturacionKey,
    activo: datos.activo,
    updated_at: new Date().toISOString(),
  };

  const client = createAdminClient();
  const { error } = await client
    .from("entidades_emisoras")
    .update(update)
    .eq("id", id);

  if (error) throw new Error(error.message);

  return { success: true };
}
