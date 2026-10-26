"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  esTablaPreciosFaltante,
  normalizarValoresIds,
} from "@/lib/utils/precios";
import {
  aplicarImportacionProducto,
  previsualizarImportacionProducto,
} from "@/lib/services/importarPreciosWeb";

const MENSAJE_MIGRACION =
  "La tabla de precios no existe. Aplica la migración 037_precios.sql en Supabase y recarga el esquema (NOTIFY pgrst, 'reload schema').";

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

export interface PrecioAdmin {
  id: string;
  valores_ids: string[];
  precio: number;
}

export interface HistorialPrecioAdmin {
  id: string;
  valores_ids: string[];
  precio_anterior: number | null;
  precio_nuevo: number | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  created_at: string;
}

export interface PreciosProductoAdmin {
  precios: PrecioAdmin[];
  historial: HistorialPrecioAdmin[];
}

export async function obtenerPreciosProducto(
  productoId: string,
): Promise<PreciosProductoAdmin> {
  await requireAdmin();
  const client = createAdminClient();

  const [preciosRes, historialRes] = await Promise.all([
    client
      .from("producto_precios")
      .select("id, valores_ids, precio")
      .eq("producto_id", productoId)
      .order("created_at"),
    client
      .from("producto_precios_historial")
      .select(
        "id, valores_ids, precio_anterior, precio_nuevo, usuario_id, created_at",
      )
      .eq("producto_id", productoId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (preciosRes.error) {
    if (esTablaPreciosFaltante(preciosRes.error)) {
      throw new Error(MENSAJE_MIGRACION);
    }
    throw new Error(preciosRes.error.message);
  }
  if (historialRes.error) {
    if (esTablaPreciosFaltante(historialRes.error)) {
      throw new Error(MENSAJE_MIGRACION);
    }
    throw new Error(historialRes.error.message);
  }

  const historial = (historialRes.data ?? []) as Omit<
    HistorialPrecioAdmin,
    "usuario_nombre"
  >[];
  const usuarioIds = [
    ...new Set(
      historial
        .map((h) => h.usuario_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let nombresPorUsuario = new Map<string, string>();
  if (usuarioIds.length > 0) {
    const { data: profiles } = await client
      .from("profiles")
      .select("id, nombre")
      .in("id", usuarioIds);
    nombresPorUsuario = new Map(
      ((profiles ?? []) as { id: string; nombre: string | null }[]).map((p) => [
        p.id,
        p.nombre ?? p.id,
      ]),
    );
  }

  return {
    precios: (preciosRes.data ?? []) as PrecioAdmin[],
    historial: historial.map((h) => ({
      ...h,
      usuario_nombre: h.usuario_id
        ? nombresPorUsuario.get(h.usuario_id) ?? null
        : null,
    })),
  };
}

export interface FilaPrecioInput {
  valores_ids: string[];
  precio: number;
}

export async function guardarPreciosProducto(
  productoId: string,
  atributosPrecio: string[],
  filas: FilaPrecioInput[],
) {
  const usuarioId = await requireAdmin();

  if (!productoId) throw new Error("Producto inválido");
  if (!Array.isArray(atributosPrecio) || !Array.isArray(filas)) {
    throw new Error("Datos de precios inválidos");
  }

  const atributos = [...new Set(atributosPrecio)];
  const normalizadas = filas.map((fila) => {
    if (!fila || !Array.isArray(fila.valores_ids)) {
      throw new Error("Variante de precio inválida");
    }
    return {
      valores_ids: normalizarValoresIds(fila.valores_ids),
      precio: Number(fila.precio),
    };
  });

  if (
    normalizadas.some(
      (fila) => !Number.isFinite(fila.precio) || fila.precio < 0,
    )
  ) {
    throw new Error("Todos los precios deben ser números mayores o iguales a 0");
  }

  const firmas = new Set<string>();
  for (const fila of normalizadas) {
    const firma = fila.valores_ids.join("|");
    if (firmas.has(firma)) {
      throw new Error("Hay variantes duplicadas en el formulario");
    }
    firmas.add(firma);
  }

  const { data, error } = await createAdminClient().rpc(
    "guardar_precios_producto",
    {
      p_producto_id: productoId,
      p_atributos_precio: atributos,
      p_precios: normalizadas,
      p_usuario_id: usuarioId,
    },
  );

  if (error) {
    if (esTablaPreciosFaltante(error)) {
      throw new Error(MENSAJE_MIGRACION);
    }
    throw new Error(error.message);
  }
  return data as { insertados: number; eliminados: number };
}

export async function previsualizarImportacion(
  productoId: string,
  atributosPrecio?: string[],
) {
  await requireAdmin();
  try {
    return await previsualizarImportacionProducto(productoId, atributosPrecio);
  } catch (error) {
    if (esTablaPreciosFaltante(error)) throw new Error(MENSAJE_MIGRACION);
    throw error;
  }
}

export async function aplicarImportacion(
  productoId: string,
  opciones: { reemplazar?: boolean; atributosPrecio?: string[] } = {},
) {
  const usuarioId = await requireAdmin();
  try {
    return await aplicarImportacionProducto(productoId, usuarioId, opciones);
  } catch (error) {
    if (esTablaPreciosFaltante(error)) throw new Error(MENSAJE_MIGRACION);
    throw error;
  }
}
