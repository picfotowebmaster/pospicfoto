import { createAdminClient } from "@/lib/supabase/admin";
import {
  generarImportacionProducto,
  normalizarTexto,
  type ConflictoPrecio,
  type DetalleImportacion,
  type FaltantePrecio,
  type FilaImportadaDetalle,
  type PrecioExistente,
  type ProductoCatalogoPrecio,
  type VariacionWeb,
} from "@/lib/utils/importarPrecios";

const STORE_URL = "https://picfoto.mx/wp-json/wc/store";
const CATEGORIAS_WEB: Record<string, string> = {
  "photo books": "photobooks",
  "mini books": "mini-books",
  acrilicos: "acrilicos",
  adhesivos: "adhesivos",
  "estuches y cajas": "estuches-y-cajas",
};

const ALIASES_PRODUCTO: Record<string, string> = {
  "porta retrato de acrilico con chapetones":
    "portarretrato de acrilico con chapetones",
  "estuche vinipiel para dvd/usb": "estuche para usb y dvd",
};

export function slugWebCategoria(nombreCategoria: string): string | null {
  return CATEGORIAS_WEB[normalizarTexto(nombreCategoria)] ?? null;
}

function nombresEquivalentes(a: string, b: string): boolean {
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);
  const aliasA = ALIASES_PRODUCTO[na] ?? na;
  const aliasB = ALIASES_PRODUCTO[nb] ?? nb;
  return na === nb || aliasA === nb || aliasB === na;
}

export interface ProductoWeb {
  id: number;
  nombre: string;
  tipo: string;
  precio: number | null;
}

export interface ImportacionResumen {
  producto: { id: string; nombre: string };
  web: { id: number; nombre: string; variaciones: number };
  total_variaciones: number;
  precios_importados: number;
  precios_existentes: number;
  precios_a_guardar: number;
  nuevos: number;
  actualizados: number;
  sin_cambios: number;
  detalle: FilaImportadaDetalle[];
  conflictos: ConflictoPrecio[];
  faltantes: FaltantePrecio[];
  incompletos: DetalleImportacion[];
  sin_mapear: DetalleImportacion[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "PicFotoPOS/1.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`No se pudo consultar la tienda (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function listarProductosWeb(
  categoriaSlug: string,
): Promise<ProductoWeb[]> {
  const data = await fetchJson<
    {
      id: number;
      name: string;
      type: string;
      prices?: { price: string; currency_minor_unit?: number };
    }[]
  >(`${STORE_URL}/products?category=${categoriaSlug}&per_page=100`);
  return (data ?? []).map((p) => {
    const precio = Number(p.prices?.price);
    const decimales = p.prices?.currency_minor_unit ?? 2;
    return {
      id: p.id,
      nombre: p.name,
      tipo: p.type,
      precio: Number.isFinite(precio) ? precio / 10 ** decimales : null,
    };
  });
}

export async function listarVariacionesWeb(
  parentId: number,
): Promise<VariacionWeb[]> {
  const variaciones: VariacionWeb[] = [];

  for (let page = 1; page <= 10; page++) {
    const data = await fetchJson<
      {
        id: number;
        permalink: string;
        prices: { price: string; currency_minor_unit?: number };
      }[]
    >(
      `${STORE_URL}/products?type=variation&parent=${parentId}&per_page=100&page=${page}`,
    );

    if (!Array.isArray(data) || data.length === 0) break;

    for (const variacion of data) {
      const precio = Number(variacion.prices?.price);
      const decimales = variacion.prices?.currency_minor_unit ?? 2;
      if (!Number.isFinite(precio)) continue;

      const atributos: Record<string, string> = {};
      try {
        const url = new URL(variacion.permalink);
        for (const [clave, valor] of url.searchParams) {
          if (clave.startsWith("attribute_pa_")) atributos[clave] = valor;
        }
      } catch {
        continue;
      }

      variaciones.push({
        id: variacion.id,
        precio: precio / 10 ** decimales,
        atributos,
      });
    }

    if (data.length < 100) break;
  }

  return variaciones;
}

async function cargarCatalogo(
  productoIds: string[],
): Promise<ProductoCatalogoPrecio[]> {
  if (productoIds.length === 0) return [];
  const client = createAdminClient();

  const { data: productos, error: prodError } = await client
    .from("productos")
    .select("id, nombre")
    .in("id", productoIds);
  if (prodError) throw new Error(prodError.message);

  const { data: mapping, error: mapError } = await client
    .from("producto_atributos")
    .select("id, producto_id, atributo_id, orden, afecta_precio")
    .in("producto_id", productoIds)
    .order("orden");
  if (mapError) throw new Error(mapError.message);

  const paIds = ((mapping ?? []) as { id: string }[]).map((m) => m.id);
  let pav: { producto_atributo_id: string; valor_id: string; orden: number }[] =
    [];
  if (paIds.length > 0) {
    const { data, error } = await client
      .from("producto_atributo_valores")
      .select("producto_atributo_id, valor_id, orden")
      .in("producto_atributo_id", paIds)
      .order("orden");
    if (error) throw new Error(error.message);
    pav = (data ?? []) as typeof pav;
  }

  const valorIds = [...new Set(pav.map((p) => p.valor_id))];
  let valores: { id: string; valor: string }[] = [];
  if (valorIds.length > 0) {
    const { data, error } = await client
      .from("atributo_valores")
      .select("id, valor")
      .in("id", valorIds);
    if (error) throw new Error(error.message);
    valores = (data ?? []) as typeof valores;
  }

  const atributoIds = [
    ...new Set(
      ((mapping ?? []) as { atributo_id: string }[]).map((m) => m.atributo_id),
    ),
  ];
  let atributos: { id: string; nombre: string }[] = [];
  if (atributoIds.length > 0) {
    const { data, error } = await client
      .from("atributos")
      .select("id, nombre")
      .in("id", atributoIds);
    if (error) throw new Error(error.message);
    atributos = (data ?? []) as typeof atributos;
  }

  const valorPorId = new Map(valores.map((v) => [v.id, v.valor]));
  const nombrePorAtributo = new Map(atributos.map((a) => [a.id, a.nombre]));

  return ((productos ?? []) as { id: string; nombre: string }[]).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    atributos: ((mapping ?? []) as {
      id: string;
      producto_id: string;
      atributo_id: string;
      orden: number;
      afecta_precio: boolean;
    }[])
      .filter((m) => m.producto_id === p.id)
      .sort((a, b) => a.orden - b.orden)
      .map((m) => ({
        atributo_id: m.atributo_id,
        nombre: nombrePorAtributo.get(m.atributo_id) ?? "",
        afecta_precio: Boolean(m.afecta_precio),
        valores: pav
          .filter((v) => v.producto_atributo_id === m.id)
          .sort((a, b) => a.orden - b.orden)
          .map((v) => ({
            id: v.valor_id,
            valor: valorPorId.get(v.valor_id) ?? "",
          })),
      })),
  }));
}

async function cargarPreciosExistentes(
  productoId: string,
): Promise<PrecioExistente[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("producto_precios")
    .select("valores_ids, precio")
    .eq("producto_id", productoId);
  if (error) throw new Error(error.message);
  return (data ?? []) as PrecioExistente[];
}

async function generarImportacion(
  productoId: string,
  opciones: { reemplazar?: boolean; atributosPrecio?: string[] } = {},
) {
  const client = createAdminClient();
  const { data: producto, error } = await client
    .from("productos")
    .select("id, nombre, categoria_id")
    .eq("id", productoId)
    .single();
  if (error || !producto) {
    throw new Error("Producto no encontrado en el catálogo");
  }

  const { data: categoria } = await client
    .from("categorias")
    .select("nombre")
    .eq("id", producto.categoria_id)
    .single();

  const categoriaSlug = slugWebCategoria(categoria?.nombre ?? "");
  if (!categoriaSlug) {
    throw new Error(
      `La categoría "${categoria?.nombre ?? "desconocida"}" no tiene mapeo a la tienda`,
    );
  }

  const [productosWeb, catalogo, preciosExistentes] = await Promise.all([
    listarProductosWeb(categoriaSlug),
    cargarCatalogo([productoId]),
    cargarPreciosExistentes(productoId),
  ]);

  const productoBase = catalogo[0];
  if (!productoBase) throw new Error("Producto sin atributos en el catálogo");

  const productoCatalogo = opciones.atributosPrecio
    ? {
        ...productoBase,
        atributos: productoBase.atributos.map((a) => ({
          ...a,
          afecta_precio: opciones.atributosPrecio!.includes(a.atributo_id),
        })),
      }
    : productoBase;

  const webProduct = productosWeb.find((p) =>
    nombresEquivalentes(p.nombre, producto.nombre as string),
  );
  if (!webProduct) {
    throw new Error(
      `No se encontró "${producto.nombre}" en la tienda (categoría ${categoriaSlug})`,
    );
  }

  let variaciones: VariacionWeb[];
  if (webProduct.tipo === "simple") {
    if (webProduct.precio === null) {
      throw new Error(`El producto "${webProduct.nombre}" no tiene precio en la tienda`);
    }
    variaciones = [
      { id: webProduct.id, precio: webProduct.precio, atributos: {} },
    ];
  } else {
    variaciones = await listarVariacionesWeb(webProduct.id);
    if (variaciones.length === 0) {
      throw new Error(
        `La tienda no devolvió variaciones para "${webProduct.nombre}"`,
      );
    }
  }

  const resultado = generarImportacionProducto(
    productoCatalogo,
    variaciones,
    preciosExistentes,
    opciones,
  );

  return { resultado, webProduct };
}

function aResumen(
  resultado: Awaited<ReturnType<typeof generarImportacion>>["resultado"],
  webProduct: ProductoWeb,
): ImportacionResumen {
  return {
    producto: resultado.producto,
    web: {
      id: webProduct.id,
      nombre: webProduct.nombre,
      variaciones: resultado.resumen.total_variaciones,
    },
    ...resultado.resumen,
    detalle: resultado.detalle,
    conflictos: resultado.conflictos,
    faltantes: resultado.faltantes,
    incompletos: resultado.incompletos,
    sin_mapear: resultado.sin_mapear,
  };
}

export async function previsualizarImportacionProducto(
  productoId: string,
  atributosPrecio?: string[],
): Promise<ImportacionResumen> {
  const { resultado, webProduct } = await generarImportacion(productoId, {
    atributosPrecio,
  });
  return aResumen(resultado, webProduct);
}

export async function aplicarImportacionProducto(
  productoId: string,
  usuarioId: string,
  opciones: { reemplazar?: boolean; atributosPrecio?: string[] } = {},
) {
  const { resultado, webProduct } = await generarImportacion(
    productoId,
    opciones,
  );

  const client = createAdminClient();
  const { data, error } = await client.rpc("guardar_precios_producto", {
    p_producto_id: productoId,
    p_atributos_precio: resultado.atributos_precio,
    p_precios: resultado.filas.map((f) => ({
      valores_ids: f.valores_ids,
      precio: f.precio,
    })),
    p_usuario_id: usuarioId,
  });

  if (error) throw new Error(error.message);

  return {
    resumen: aResumen(resultado, webProduct),
    guardado: data as { insertados: number; eliminados: number },
  };
}
