"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AlcanceDescuento,
  Descuento,
  TipoDescuento,
} from "@/lib/supabase/types";
import { esTablaDescuentosFaltante } from "@/lib/utils/descuentos";

const MENSAJE_MIGRACION =
  "La tabla de descuentos no existe. Aplica la migración 048_descuentos.sql en Supabase y recarga el esquema (NOTIFY pgrst, 'reload schema').";

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

export interface DescuentoAdmin extends Descuento {
  destino_nombre: string;
}

export interface OpcionesDescuento {
  categorias: { id: string; nombre: string }[];
  productos: { id: string; nombre: string; categoria_id: string }[];
}

export interface DescuentoInput {
  id?: string;
  nombre: string;
  tipo: TipoDescuento;
  valor: number;
  alcance: AlcanceDescuento;
  producto_id?: string | null;
  categoria_id?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

export interface ConflictoDescuento {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoDescuento;
  valor: number;
}

function validarFecha(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

export async function listarDescuentos(): Promise<DescuentoAdmin[]> {
  await requireAdmin();
  const client = createAdminClient();
  const { data, error } = await client
    .from("descuentos")
    .select("*, productos(nombre), categorias(nombre)")
    .order("fecha_inicio", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (esTablaDescuentosFaltante(error)) throw new Error(MENSAJE_MIGRACION);
    throw new Error(error.message);
  }

  return ((data ?? []) as (Descuento & {
    productos?: { nombre: string } | null;
    categorias?: { nombre: string } | null;
  })[]).map((row) => ({
    ...row,
    destino_nombre:
      row.productos?.nombre ?? row.categorias?.nombre ?? "Sin destino",
  }));
}

export async function listarOpcionesDescuento(): Promise<OpcionesDescuento> {
  await requireAdmin();
  const client = createAdminClient();

  const [categoriasRes, productosRes] = await Promise.all([
    client
      .from("categorias")
      .select("id, nombre")
      .eq("activo", true)
      .order("orden")
      .order("nombre"),
    client
      .from("productos")
      .select("id, nombre, categoria_id")
      .eq("activo", true)
      .order("nombre"),
  ]);

  if (categoriasRes.error) throw new Error(categoriasRes.error.message);
  if (productosRes.error) throw new Error(productosRes.error.message);

  return {
    categorias: (categoriasRes.data ?? []) as {
      id: string;
      nombre: string;
    }[],
    productos: (productosRes.data ?? []) as {
      id: string;
      nombre: string;
      categoria_id: string;
    }[],
  };
}

export async function guardarDescuento(input: DescuentoInput): Promise<{
  descuento: Descuento;
  conflictos: ConflictoDescuento[];
}> {
  const usuarioId = await requireAdmin();

  const nombre = input.nombre?.trim();
  if (!nombre) throw new Error("El nombre es obligatorio");

  if (!["porcentaje", "monto_fijo"].includes(input.tipo)) {
    throw new Error("Tipo de descuento inválido");
  }
  if (!["producto", "categoria"].includes(input.alcance)) {
    throw new Error("Alcance de descuento inválido");
  }

  const valor = Number(input.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("El valor debe ser mayor a 0");
  }
  if (input.tipo === "porcentaje" && valor >= 100) {
    throw new Error("El porcentaje debe ser menor a 100");
  }

  if (!validarFecha(input.fecha_inicio) || !validarFecha(input.fecha_fin)) {
    throw new Error("Las fechas no son válidas");
  }
  if (input.fecha_fin < input.fecha_inicio) {
    throw new Error("La fecha final debe ser igual o posterior a la inicial");
  }

  const productoId =
    input.alcance === "producto" ? input.producto_id ?? null : null;
  const categoriaId =
    input.alcance === "categoria" ? input.categoria_id ?? null : null;

  if (input.alcance === "producto" && !productoId) {
    throw new Error("Selecciona un producto");
  }
  if (input.alcance === "categoria" && !categoriaId) {
    throw new Error("Selecciona una categoría");
  }

  const client = createAdminClient();

  if (productoId) {
    const { data } = await client
      .from("productos")
      .select("id")
      .eq("id", productoId)
      .maybeSingle();
    if (!data) throw new Error("El producto no existe");
  }
  if (categoriaId) {
    const { data } = await client
      .from("categorias")
      .select("id")
      .eq("id", categoriaId)
      .maybeSingle();
    if (!data) throw new Error("La categoría no existe");
  }

  const fila = {
    nombre,
    tipo: input.tipo,
    valor,
    alcance: input.alcance,
    producto_id: productoId,
    categoria_id: categoriaId,
    fecha_inicio: input.fecha_inicio,
    fecha_fin: input.fecha_fin,
    activo: Boolean(input.activo),
  };

  let descuento: Descuento;
  if (input.id) {
    const { data, error } = await client
      .from("descuentos")
      .update(fila)
      .eq("id", input.id)
      .select()
      .single();
    if (error) {
      if (esTablaDescuentosFaltante(error)) throw new Error(MENSAJE_MIGRACION);
      throw new Error(error.message);
    }
    descuento = data as Descuento;
  } else {
    const { data, error } = await client
      .from("descuentos")
      .insert({ ...fila, created_by: usuarioId })
      .select()
      .single();
    if (error) {
      if (esTablaDescuentosFaltante(error)) throw new Error(MENSAJE_MIGRACION);
      throw new Error(error.message);
    }
    descuento = data as Descuento;
  }

  let conflictos: ConflictoDescuento[] = [];
  if (input.activo) {
    let conflictoQuery = client
      .from("descuentos")
      .select("id, nombre, fecha_inicio, fecha_fin, tipo, valor")
      .eq("activo", true)
      .lte("fecha_inicio", input.fecha_fin)
      .gte("fecha_fin", input.fecha_inicio);

    if (productoId) {
      conflictoQuery = conflictoQuery.eq("producto_id", productoId);
    }
    if (categoriaId) {
      conflictoQuery = conflictoQuery.eq("categoria_id", categoriaId);
    }
    if (input.id) conflictoQuery = conflictoQuery.neq("id", input.id);

    const { data } = await conflictoQuery;
    conflictos = (data ?? []) as ConflictoDescuento[];
  }

  return { descuento, conflictos };
}

export async function toggleDescuento(id: string, activo: boolean) {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("descuentos")
    .update({ activo })
    .eq("id", id);
  if (error) {
    if (esTablaDescuentosFaltante(error)) throw new Error(MENSAJE_MIGRACION);
    throw new Error(error.message);
  }
}

export async function eliminarDescuento(id: string) {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("descuentos")
    .delete()
    .eq("id", id);
  if (error) {
    if (esTablaDescuentosFaltante(error)) throw new Error(MENSAJE_MIGRACION);
    throw new Error(error.message);
  }
}
