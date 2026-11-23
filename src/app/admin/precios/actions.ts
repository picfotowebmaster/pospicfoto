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
import { fetchAllPages } from "@/lib/utils/paginado";
import { normalizarTexto } from "@/lib/utils/importarPrecios";
import {
  construirPayloadCreacionProducto,
  construirPlanAplicacionPreciosCsv,
  construirPlantillaPreciosCsv,
  construirPrevisualizacionPreciosCsv,
  type ContextoPreciosCategoria,
  type ProductoNuevoPlanPreciosCsv,
} from "@/lib/utils/preciosCsv";

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
  inactivos: number;
  historial: HistorialPrecioAdmin[];
}

export async function obtenerPreciosProducto(
  productoId: string,
): Promise<PreciosProductoAdmin> {
  await requireAdmin();
  const client = createAdminClient();

  const [preciosRes, inactivosRes, historialRes] = await Promise.all([
    client
      .from("producto_precios")
      .select("id, valores_ids, precio")
      .eq("producto_id", productoId)
      .eq("activo", true)
      .order("created_at"),
    client
      .from("producto_precios")
      .select("id", { count: "exact", head: true })
      .eq("producto_id", productoId)
      .eq("activo", false),
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
  if (inactivosRes.error) {
    if (esTablaPreciosFaltante(inactivosRes.error)) {
      throw new Error(MENSAJE_MIGRACION);
    }
    throw new Error(inactivosRes.error.message);
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
    inactivos: inactivosRes.count ?? 0,
    historial: historial.map((h) => ({
      ...h,
      usuario_nombre: h.usuario_id
        ? nombresPorUsuario.get(h.usuario_id) ?? null
        : null,
    })),
  };
}

export async function reactivarPreciosProducto(
  productoId: string,
): Promise<number> {
  await requireAdmin();
  if (!productoId) throw new Error("Producto inválido");

  const client = createAdminClient();
  const { data, error } = await client
    .from("producto_precios")
    .update({ activo: true, updated_at: new Date().toISOString() })
    .eq("producto_id", productoId)
    .eq("activo", false)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
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

const MAX_CARACTERES_CSV = 1_000_000;
const MAX_FILAS_CSV = 5_000;
const ORDEN_TAMANOS_MARCOS = [
  '8x10"',
  '8.5x11"',
  '11x14"',
  '11x16"',
  '16x20"',
  '16x24"',
  '20x24"',
  '20x30"',
  '24x30"',
  '24x36"',
  '30x40"',
];

function ordenTamanoMarco(valor: string): number {
  const indice = ORDEN_TAMANOS_MARCOS.indexOf(valor);
  return indice === -1 ? Number.MAX_SAFE_INTEGER : indice;
}

async function cargarContextoPreciosCategoria(
  categoriaId: string,
): Promise<ContextoPreciosCategoria> {
  const client = createAdminClient();

  const { data: categoria, error: categoriaError } = await client
    .from("categorias")
    .select("id, nombre")
    .eq("id", categoriaId)
    .maybeSingle();

  if (categoriaError) throw new Error(categoriaError.message);
  if (!categoria) throw new Error("Categoría no encontrada.");

  const { data: productos, error: productosError } = await client
    .from("productos")
    .select("id, nombre")
    .eq("categoria_id", categoriaId)
    .order("orden")
    .order("nombre");

  if (productosError) throw new Error(productosError.message);

  const productosBase = (productos ?? []) as { id: string; nombre: string }[];
  if (productosBase.length === 0) {
    if (normalizarTexto(categoria.nombre) !== normalizarTexto("Marcos")) {
      return {
        categoria_id: categoria.id,
        categoria_nombre: categoria.nombre,
        permite_crear_productos: false,
        atributos_precio_catalogo: [],
        atributos_informativos_catalogo: [],
        colores_globales: [],
        productos: [],
      };
    }

    const { data: atributosBase, error: atributosBaseError } = await client
      .from("atributos")
      .select("id, nombre")
      .in("nombre", ["Tamaño de Marco", "Color marco"]);

    if (atributosBaseError) throw new Error(atributosBaseError.message);

    const atributoTamano = (atributosBase ?? []).find(
      (atributo) =>
        normalizarTexto(atributo.nombre) ===
        normalizarTexto("Tamaño de Marco"),
    );
    const atributoColor = (atributosBase ?? []).find(
      (atributo) =>
        normalizarTexto(atributo.nombre) === normalizarTexto("Color marco"),
    );

    if (!atributoTamano || !atributoColor) {
      return {
        categoria_id: categoria.id,
        categoria_nombre: categoria.nombre,
        permite_crear_productos: false,
        atributos_precio_catalogo: [],
        atributos_informativos_catalogo: [],
        colores_globales: [],
        productos: [],
      };
    }

    const { data: valoresBase, error: valoresBaseError } = await client
      .from("atributo_valores")
      .select("id, valor, atributo_id")
      .in("atributo_id", [atributoTamano.id, atributoColor.id]);

    if (valoresBaseError) throw new Error(valoresBaseError.message);

    const tamanos = (valoresBase ?? [])
      .filter((valor) => valor.atributo_id === atributoTamano.id)
      .map((valor) => ({ id: valor.id, valor: valor.valor }))
      .sort((a, b) => ordenTamanoMarco(a.valor) - ordenTamanoMarco(b.valor));

    const colores = (valoresBase ?? [])
      .filter((valor) => valor.atributo_id === atributoColor.id)
      .map((valor) => ({ id: valor.id, valor: valor.valor }))
      .sort((a, b) => a.valor.localeCompare(b.valor));

    return {
      categoria_id: categoria.id,
      categoria_nombre: categoria.nombre,
      permite_crear_productos: tamanos.length > 0 && colores.length > 0,
      atributos_precio_catalogo: [
        {
          atributo_id: atributoTamano.id,
          nombre: atributoTamano.nombre,
          valores: tamanos,
        },
      ],
      atributos_informativos_catalogo: [
        {
          atributo_id: atributoColor.id,
          nombre: atributoColor.nombre,
        },
      ],
      colores_globales: colores,
      productos: [],
    };
  }

  const productoIds = productosBase.map((producto) => producto.id);

  const { data: mapping, error: mappingError } = await client
    .from("producto_atributos")
    .select("id, producto_id, atributo_id, orden, afecta_precio")
    .in("producto_id", productoIds)
    .order("orden");

  if (mappingError) throw new Error(mappingError.message);

  const mappingBase = (mapping ?? []) as {
    id: string;
    producto_id: string;
    atributo_id: string;
    orden: number;
    afecta_precio: boolean;
  }[];

  const paIds = mappingBase.map((fila) => fila.id);
  const pav =
    paIds.length > 0
      ? await fetchAllPages<{
          producto_atributo_id: string;
          valor_id: string;
          orden: number;
        }>((from, to) =>
          client
            .from("producto_atributo_valores")
            .select("producto_atributo_id, valor_id, orden")
            .in("producto_atributo_id", paIds)
            .order("producto_atributo_id")
            .order("orden")
            .range(from, to),
        )
      : [];

  const valorIds = [...new Set(pav.map((fila) => fila.valor_id))];
  let valores: { id: string; valor: string }[] = [];
  if (valorIds.length > 0) {
    const { data, error } = await client
      .from("atributo_valores")
      .select("id, valor")
      .in("id", valorIds);
    if (error) throw new Error(error.message);
    valores = (data ?? []) as { id: string; valor: string }[];
  }

  const atributoIds = [
    ...new Set(mappingBase.map((fila) => fila.atributo_id)),
  ];
  let atributos: { id: string; nombre: string }[] = [];
  if (atributoIds.length > 0) {
    const { data, error } = await client
      .from("atributos")
      .select("id, nombre")
      .in("id", atributoIds);
    if (error) throw new Error(error.message);
    atributos = (data ?? []) as { id: string; nombre: string }[];
  }

  const precios = await fetchAllPages<{
    producto_id: string;
    valores_ids: string[];
    precio: number;
  }>((from, to) =>
    client
      .from("producto_precios")
      .select("producto_id, valores_ids, precio")
      .in("producto_id", productoIds)
      .eq("activo", true)
      .order("id")
      .range(from, to),
  );

  const valorPorId = new Map(
    valores.map((valor) => [valor.id, valor.valor]),
  );
  const atributoPorId = new Map(
    atributos.map((atributo) => [atributo.id, atributo.nombre]),
  );

  const precioCatalogo = new Map<
    string,
    {
      atributo_id: string;
      nombre: string;
      valores: Map<string, string>;
    }
  >();
  const informativosCatalogo = new Map<
    string,
    { atributo_id: string; nombre: string }
  >();

  for (const fila of mappingBase) {
    if (fila.afecta_precio) {
      const actual = precioCatalogo.get(fila.atributo_id) ?? {
        atributo_id: fila.atributo_id,
        nombre: atributoPorId.get(fila.atributo_id) ?? "Atributo",
        valores: new Map<string, string>(),
      };
      for (const valor of pav.filter(
        (item) => item.producto_atributo_id === fila.id,
      )) {
        actual.valores.set(
          valor.valor_id,
          valorPorId.get(valor.valor_id) ?? "",
        );
      }
      precioCatalogo.set(fila.atributo_id, actual);
    } else {
      informativosCatalogo.set(fila.atributo_id, {
        atributo_id: fila.atributo_id,
        nombre: atributoPorId.get(fila.atributo_id) ?? "Atributo",
      });
    }
  }

  const atributosPrecioCatalogo = [...precioCatalogo.values()].map(
    (atributo) => ({
      atributo_id: atributo.atributo_id,
      nombre: atributo.nombre,
      valores: [...atributo.valores.entries()].map(([id, valor]) => ({
        id,
        valor,
      })),
    }),
  );
  const atributosInformativosCatalogo = [...informativosCatalogo.values()];
  const atributoColor = atributosInformativosCatalogo.find(
    (atributo) => atributo.nombre.trim().toLowerCase() === "color marco",
  );

  let coloresGlobales: { id: string; valor: string }[] = [];
  if (atributoColor) {
    const { data, error } = await client
      .from("atributo_valores")
      .select("id, valor")
      .eq("atributo_id", atributoColor.atributo_id)
      .order("valor");
    if (error) throw new Error(error.message);
    coloresGlobales = (data ?? []) as { id: string; valor: string }[];
  }

  return {
    categoria_id: categoria.id,
    categoria_nombre: categoria.nombre,
    permite_crear_productos:
      categoria.nombre.trim().toLowerCase() === "marcos" &&
      atributosPrecioCatalogo.length > 0 &&
      Boolean(atributoColor),
    atributos_precio_catalogo: atributosPrecioCatalogo,
    atributos_informativos_catalogo: atributosInformativosCatalogo,
    colores_globales: coloresGlobales,
    productos: productosBase.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      atributos_precio: mappingBase
        .filter(
          (fila) => fila.producto_id === producto.id && fila.afecta_precio,
        )
        .sort((a, b) => a.orden - b.orden)
        .map((fila) => ({
          atributo_id: fila.atributo_id,
          nombre: atributoPorId.get(fila.atributo_id) ?? "Atributo",
          valores: pav
            .filter((valor) => valor.producto_atributo_id === fila.id)
            .sort((a, b) => a.orden - b.orden)
            .map((valor) => ({
              id: valor.valor_id,
              valor: valorPorId.get(valor.valor_id) ?? "",
            })),
        })),
      atributos_informativos: mappingBase
        .filter(
          (fila) => fila.producto_id === producto.id && !fila.afecta_precio,
        )
        .sort((a, b) => a.orden - b.orden)
        .map((fila) => ({
          nombre: atributoPorId.get(fila.atributo_id) ?? "Atributo",
          valores: pav
            .filter((valor) => valor.producto_atributo_id === fila.id)
            .sort((a, b) => a.orden - b.orden)
            .map((valor) => valorPorId.get(valor.valor_id) ?? ""),
        })),
      precios: precios
        .filter((precio) => precio.producto_id === producto.id)
        .map((precio) => ({
          valores_ids: precio.valores_ids,
          precio: Number(precio.precio),
        })),
    })),
  };
}

function validarContenidoCsv(contenido: string) {
  if (typeof contenido !== "string" || contenido.trim() === "") {
    throw new Error("El archivo CSV está vacío.");
  }
  if (contenido.length > MAX_CARACTERES_CSV) {
    throw new Error("El archivo es demasiado grande (máximo 1 MB).");
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function crearProductoMarcos(
  client: AdminClient,
  contexto: ContextoPreciosCategoria,
  nuevo: ProductoNuevoPlanPreciosCsv,
  usuarioId: string,
  coloresDisponibles: Map<string, string>,
): Promise<{
  producto_id: string;
  colores_creados: number;
  precios_creados: number;
}> {
  if (contexto.categoria_nombre.trim().toLowerCase() !== "marcos") {
    throw new Error("Solo se pueden crear productos desde el importador de Marcos.");
  }

  const atributoColor = contexto.atributos_informativos_catalogo.find(
    (atributo) => normalizarTexto(atributo.nombre) === normalizarTexto("Color marco"),
  );
  if (!atributoColor) {
    throw new Error("No se encontró el atributo Color marco.");
  }

  const { data: existentes, error: existentesError } = await client
    .from("productos")
    .select("id, nombre")
    .eq("categoria_id", contexto.categoria_id);

  if (existentesError) throw new Error(existentesError.message);

  const productosCategoria = (existentes ?? []) as {
    id: string;
    nombre: string;
  }[];

  const existente = productosCategoria.find(
    (producto) =>
      normalizarTexto(producto.nombre) === normalizarTexto(nuevo.nombre),
  );
  if (existente) {
    throw new Error(
      `El producto "${nuevo.nombre}" ya existe. Vuelve a previsualizar el archivo.`,
    );
  }

  const payload = construirPayloadCreacionProducto(
    nuevo,
    contexto,
    coloresDisponibles,
  );

  if (payload.atributos_precio.some((item) => item.valores_ids.length === 0)) {
    throw new Error(
      "La moldura no tiene valores para todos los atributos de precio.",
    );
  }

  const { data, error } = await client.rpc("crear_producto_marcos_csv", {
    p_categoria_id: contexto.categoria_id,
    p_nombre: nuevo.nombre,
    p_atributos_precio: payload.atributos_precio,
    p_atributo_color: atributoColor.atributo_id,
    p_colores: payload.colores,
    p_precios: payload.precios,
    p_usuario_id: usuarioId,
  });

  if (error) {
    if (
      error.code === "PGRST202" ||
      error.message.includes("crear_producto_marcos_csv")
    ) {
      throw new Error(
        "Aplica la migración 071_crear_producto_marcos_csv.sql y recarga el esquema (NOTIFY pgrst, 'reload schema').",
      );
    }
    throw new Error(error.message);
  }

  const resultado = (data ?? {}) as {
    producto_id?: string;
    colores_creados?: number;
    precios_creados?: number;
  };

  if (!resultado.producto_id) {
    throw new Error("La base no devolvió el producto creado.");
  }

  for (const color of payload.colores) {
    coloresDisponibles.set(normalizarTexto(color), color);
  }

  return {
    producto_id: resultado.producto_id,
    colores_creados: Number(resultado.colores_creados ?? 0),
    precios_creados: Number(resultado.precios_creados ?? 0),
  };
}

export async function generarPlantillaPreciosCsv(categoriaId: string) {
  await requireAdmin();
  if (!categoriaId) throw new Error("Selecciona una categoría.");

  const contexto = await cargarContextoPreciosCategoria(categoriaId);
  if (contexto.productos.length === 0) {
    throw new Error("La categoría no tiene productos.");
  }

  return construirPlantillaPreciosCsv(contexto);
}

export async function previsualizarPreciosCsv(
  categoriaId: string,
  contenido: string,
  opciones: { crearProductosFaltantes?: boolean } = {},
) {
  await requireAdmin();
  if (!categoriaId) throw new Error("Selecciona una categoría.");
  validarContenidoCsv(contenido);

  const contexto = await cargarContextoPreciosCategoria(categoriaId);
  const preview = construirPrevisualizacionPreciosCsv(
    contexto,
    contenido,
    opciones,
  );

  if (preview.resumen.total_filas > MAX_FILAS_CSV) {
    throw new Error(
      `El archivo tiene demasiadas filas (máximo ${MAX_FILAS_CSV.toLocaleString("es-MX")}).`,
    );
  }

  return preview;
}

export async function aplicarPreciosCsv(
  categoriaId: string,
  contenido: string,
  opciones: { crearProductosFaltantes?: boolean } = {},
) {
  const usuarioId = await requireAdmin();
  if (!categoriaId) throw new Error("Selecciona una categoría.");
  validarContenidoCsv(contenido);

  const contexto = await cargarContextoPreciosCategoria(categoriaId);
  const preview = construirPrevisualizacionPreciosCsv(
    contexto,
    contenido,
    opciones,
  );

  if (preview.errores.length > 0) {
    throw new Error(
      `El archivo tiene ${preview.errores.length} error(es). Corrige y vuelve a previsualizar.`,
    );
  }

  const plan = construirPlanAplicacionPreciosCsv(preview, contexto);
  if (plan.errores.length > 0) {
    throw new Error(plan.errores[0]?.mensaje ?? "No se pudo preparar la importación.");
  }

  const client = createAdminClient();
  const errores: { producto: string; mensaje: string }[] = [];
  const coloresDisponibles = new Map(
    contexto.colores_globales.map((color) => [
      normalizarTexto(color.valor),
      color.valor,
    ]),
  );
  let insertados = 0;
  let eliminados = 0;
  let productosCreados = 0;
  let coloresCreados = 0;
  let preciosCreados = 0;

  for (const producto of plan.productos_nuevos) {
    try {
      const creado = await crearProductoMarcos(
        client,
        contexto,
        producto,
        usuarioId,
        coloresDisponibles,
      );
      productosCreados++;
      coloresCreados += creado.colores_creados;
      preciosCreados += creado.precios_creados;
      insertados += creado.precios_creados;
    } catch (error) {
      errores.push({
        producto: producto.nombre,
        mensaje:
          error instanceof Error
            ? error.message
            : "No se pudo crear el producto.",
      });
    }
  }

  const actualizarExistentes = errores.length === 0;

  if (actualizarExistentes) {
    for (const producto of plan.productos) {
      const { data, error } = await client.rpc("guardar_precios_producto", {
        p_producto_id: producto.producto_id,
        p_atributos_precio: producto.atributos_precio,
        p_precios: producto.precios,
        p_usuario_id: usuarioId,
      });

      if (error) {
        if (esTablaPreciosFaltante(error)) throw new Error(MENSAJE_MIGRACION);
        errores.push({
          producto: producto.producto_nombre,
          mensaje: error.message,
        });
        continue;
      }

      const resultado = (data ?? {}) as {
        insertados?: number;
        eliminados?: number;
      };
      insertados += Number(resultado.insertados ?? 0);
      eliminados += Number(resultado.eliminados ?? 0);
    }
  }

  return {
    productos: actualizarExistentes ? plan.productos.length : 0,
    productos_creados: productosCreados,
    colores_creados: coloresCreados,
    precios_creados: preciosCreados,
    cambios:
      (actualizarExistentes
        ? plan.productos.reduce(
            (total, producto) => total + producto.cambios,
            0,
          )
        : 0) + preciosCreados,
    insertados,
    eliminados,
    errores,
    preview,
  };
}
