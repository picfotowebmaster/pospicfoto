import { supabase } from "../supabase/client";
import type {
  Atributo,
  AtributoValor,
  Categoria,
  Producto,
  ProductoAtributo,
  ProductoConAtributos,
} from "../supabase/types";

export interface Catalogo {
  categorias: Categoria[];
  productos: ProductoConAtributos[];
}

export async function fetchCatalogo(): Promise<Catalogo> {
  const [catsRes, prodsRes, mapRes, attrsRes] = await Promise.all([
    supabase.from("categorias").select("*").eq("activo", true).order("orden").order("nombre"),
    supabase.from("productos").select("*").eq("activo", true).order("orden").order("nombre"),
    supabase.from("producto_atributos").select("*").order("orden"),
    supabase
      .from("atributos")
      .select("*, atributo_valores(*)")
      .eq("activo", true)
      .order("nombre"),
  ]);

  if (catsRes.error) throw catsRes.error;
  if (prodsRes.error) throw prodsRes.error;
  if (mapRes.error) throw mapRes.error;
  if (attrsRes.error) throw attrsRes.error;

  const categorias = (catsRes.data ?? []) as Categoria[];
  const productos = (prodsRes.data ?? []) as Producto[];
  const mapping = (mapRes.data ?? []) as ProductoAtributo[];

  const attrsById = new Map<string, Atributo & { valores: AtributoValor[] }>();
  for (const a of (attrsRes.data ?? []) as (Atributo & { atributo_valores: AtributoValor[] })[]) {
    attrsById.set(a.id, {
      id: a.id,
      nombre: a.nombre,
      activo: a.activo,
      valores: (a.atributo_valores ?? []).sort((x, y) => x.valor.localeCompare(y.valor)),
    });
  }

  const catById = new Map(categorias.map((c) => [c.id, c.nombre]));

  const productosConAtributos: ProductoConAtributos[] = productos.map((p) => ({
    ...p,
    categoria_nombre: catById.get(p.categoria_id) ?? "",
    atributos: mapping
      .filter((m) => m.producto_id === p.id)
      .sort((x, y) => x.orden - y.orden)
      .map((m) => attrsById.get(m.atributo_id))
      .filter((a): a is Atributo & { valores: AtributoValor[] } => Boolean(a)),
  }));

  return { categorias, productos: productosConAtributos };
}
