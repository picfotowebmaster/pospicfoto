"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Atributo,
  AtributoValor,
  Categoria,
  Producto,
  ProductoAtributo,
  RutaProduccion,
} from "@/lib/supabase/types";

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

export interface ProductoAdmin extends Producto {
  categoria_nombre: string;
  atributo_ids: string[];
}

export interface CatalogoAdmin {
  categorias: Categoria[];
  productos: ProductoAdmin[];
  atributos: (Atributo & { valores: AtributoValor[] })[];
}

export async function listarCatalogoAdmin(): Promise<CatalogoAdmin> {
  await requireAdmin();
  const client = createAdminClient();

  const [cats, prods, mapping, attrs] = await Promise.all([
    client.from("categorias").select("*").order("orden").order("nombre"),
    client.from("productos").select("*").order("orden").order("nombre"),
    client.from("producto_atributos").select("*").order("orden"),
    client.from("atributos").select("*, atributo_valores(*)").order("nombre"),
  ]);

  if (cats.error) throw new Error(cats.error.message);
  if (prods.error) throw new Error(prods.error.message);
  if (mapping.error) throw new Error(mapping.error.message);
  if (attrs.error) throw new Error(attrs.error.message);

  const categorias = (cats.data ?? []) as Categoria[];
  const productos = (prods.data ?? []) as Producto[];
  const map = (mapping.data ?? []) as ProductoAtributo[];
  const catById = new Map(categorias.map((c) => [c.id, c.nombre]));

  return {
    categorias,
    productos: productos.map((p) => ({
      ...p,
      categoria_nombre: catById.get(p.categoria_id) ?? "",
      atributo_ids: map
        .filter((m) => m.producto_id === p.id)
        .sort((a, b) => a.orden - b.orden)
        .map((m) => m.atributo_id),
    })),
    atributos: ((attrs.data ?? []) as (Atributo & { atributo_valores: AtributoValor[] })[]).map(
      (a) => ({ id: a.id, nombre: a.nombre, activo: a.activo, valores: a.atributo_valores ?? [] }),
    ),
  };
}

export async function crearCategoria(nombre: string) {
  await requireAdmin();
  const trimmed = nombre.trim();
  if (!trimmed) throw new Error("El nombre es obligatorio");
  const { error } = await createAdminClient().from("categorias").insert({ nombre: trimmed });
  if (error) throw new Error(error.message);
}

export async function actualizarCategoria(
  id: string,
  datos: { nombre?: string; activo?: boolean; orden?: number },
) {
  await requireAdmin();
  const patch: Record<string, unknown> = {};
  if (datos.nombre !== undefined) patch.nombre = datos.nombre.trim();
  if (datos.activo !== undefined) patch.activo = datos.activo;
  if (datos.orden !== undefined) patch.orden = datos.orden;
  if (Object.keys(patch).length === 0) return;
  const { error } = await createAdminClient().from("categorias").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function eliminarCategoria(id: string) {
  await requireAdmin();
  const { error } = await createAdminClient().from("categorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function crearProducto(
  categoriaId: string,
  nombre: string,
  ruta: RutaProduccion,
) {
  await requireAdmin();
  const trimmed = nombre.trim();
  if (!trimmed) throw new Error("El nombre es obligatorio");
  const { error } = await createAdminClient()
    .from("productos")
    .insert({ categoria_id: categoriaId, nombre: trimmed, ruta });
  if (error) throw new Error(error.message);
}

export async function actualizarProducto(
  id: string,
  datos: { nombre?: string; ruta?: RutaProduccion; activo?: boolean; orden?: number },
) {
  await requireAdmin();
  const patch: Record<string, unknown> = {};
  if (datos.nombre !== undefined) patch.nombre = datos.nombre.trim();
  if (datos.ruta !== undefined) patch.ruta = datos.ruta;
  if (datos.activo !== undefined) patch.activo = datos.activo;
  if (datos.orden !== undefined) patch.orden = datos.orden;
  if (Object.keys(patch).length === 0) return;
  const { error } = await createAdminClient().from("productos").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function eliminarProducto(id: string) {
  await requireAdmin();
  const { error } = await createAdminClient().from("productos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function guardarProductoAtributos(productoId: string, atributoIds: string[]) {
  await requireAdmin();
  const client = createAdminClient();
  const { error: delErr } = await client
    .from("producto_atributos")
    .delete()
    .eq("producto_id", productoId);
  if (delErr) throw new Error(delErr.message);
  if (atributoIds.length === 0) return;
  const { error } = await client.from("producto_atributos").insert(
    atributoIds.map((atributo_id, index) => ({
      producto_id: productoId,
      atributo_id,
      orden: index,
    })),
  );
  if (error) throw new Error(error.message);
}
