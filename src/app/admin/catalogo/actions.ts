"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  construirPlantillaValoresCsv,
  construirPrevisualizacionValoresCsv,
  type AtributoValoresCsv,
} from "@/lib/utils/atributosCsv";
import { slugArchivo } from "@/lib/utils/descargarCsv";

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

export async function crearAtributo(nombre: string) {
  await requireAdmin();
  const trimmed = nombre.trim();
  if (!trimmed) throw new Error("El nombre del atributo es obligatorio");

  const { data, error } = await createAdminClient()
    .from("atributos")
    .insert({ nombre: trimmed })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearValor(atributoId: string, valor: string) {
  await requireAdmin();
  const trimmed = valor.trim();
  if (!trimmed) throw new Error("El valor es obligatorio");

  const { error } = await createAdminClient()
    .from("atributo_valores")
    .insert({ atributo_id: atributoId, valor: trimmed });

  if (error && error.code !== "23505") throw new Error(error.message);
}

export async function toggleAtributoActivo(id: string, activo: boolean) {
  await requireAdmin();

  const { error } = await createAdminClient()
    .from("atributos")
    .update({ activo })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

const MAX_CARACTERES_CSV = 1_000_000;
const MAX_FILAS_CSV = 5_000;
const MENSAJE_MIGRACION =
  "Aplica la migración 072_atributos_csv_y_eliminar_valor.sql y recarga el esquema (NOTIFY pgrst, 'reload schema').";

function esFuncionFaltante(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST202" ||
    /could not find the function|function .* does not exist/i.test(
      error.message ?? "",
    )
  );
}

function validarCsvAtributos(contenido: string) {
  if (typeof contenido !== "string" || contenido.trim() === "") {
    throw new Error("El archivo CSV está vacío.");
  }
  if (contenido.length > MAX_CARACTERES_CSV) {
    throw new Error("El archivo es demasiado grande (máximo 1 MB).");
  }
}

async function cargarAtributoValores(
  atributoId: string,
): Promise<AtributoValoresCsv> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("atributos")
    .select("id, nombre, atributo_valores(id, valor)")
    .eq("id", atributoId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("El atributo no existe.");

  return {
    id: data.id as string,
    nombre: data.nombre as string,
    valores: ((data.atributo_valores ?? []) as {
      id: string;
      valor: string;
    }[]).map((valor) => ({
      id: valor.id,
      valor: valor.valor,
    })),
  };
}

export async function generarPlantillaValoresCsv(atributoId: string) {
  await requireAdmin();
  if (!atributoId) throw new Error("Selecciona un atributo.");

  const atributo = await cargarAtributoValores(atributoId);

  return {
    nombreArchivo: `valores-${slugArchivo(atributo.nombre) || "atributo"}.csv`,
    contenido: construirPlantillaValoresCsv(),
  };
}

export async function previsualizarValoresCsv(
  atributoId: string,
  contenido: string,
) {
  await requireAdmin();
  if (!atributoId) throw new Error("Selecciona un atributo.");
  validarCsvAtributos(contenido);

  const atributo = await cargarAtributoValores(atributoId);
  const preview = construirPrevisualizacionValoresCsv(atributo, contenido);

  if (preview.resumen.filas > MAX_FILAS_CSV) {
    throw new Error(
      `El archivo tiene demasiadas filas (máximo ${MAX_FILAS_CSV.toLocaleString("es-MX")}).`,
    );
  }

  return preview;
}

export async function aplicarValoresCsv(
  atributoId: string,
  contenido: string,
) {
  await requireAdmin();
  if (!atributoId) throw new Error("Selecciona un atributo.");
  validarCsvAtributos(contenido);

  const atributo = await cargarAtributoValores(atributoId);
  const preview = construirPrevisualizacionValoresCsv(atributo, contenido);

  if (preview.errores.length > 0) {
    throw new Error(
      `El archivo tiene ${preview.errores.length} error(es). Corrige y vuelve a previsualizar.`,
    );
  }

  if (preview.payload.length === 0) {
    return {
      valores_creados: 0,
      preview,
    };
  }

  const { data, error } = await createAdminClient().rpc(
    "importar_valores_atributo",
    {
      p_atributo_id: atributoId,
      p_valores: preview.payload,
    },
  );

  if (error) {
    if (esFuncionFaltante(error)) {
      throw new Error(
        "Aplica la migración 073_importar_valores_atributo.sql y recarga el esquema (NOTIFY pgrst, 'reload schema').",
      );
    }
    throw new Error(error.message);
  }

  const resultado = (data ?? {}) as { valores_creados?: number };

  return {
    valores_creados: Number(resultado.valores_creados ?? 0),
    preview,
  };
}

export async function obtenerUsoValor(valorId: string) {
  await requireAdmin();
  const client = createAdminClient();

  const { data: valor, error: valorError } = await client
    .from("atributo_valores")
    .select("id, valor, atributo_id")
    .eq("id", valorId)
    .maybeSingle();

  if (valorError) throw new Error(valorError.message);
  if (!valor) throw new Error("El valor no existe.");

  const { count: precios, error: preciosError } = await client
    .from("producto_precios")
    .select("id", { count: "exact", head: true })
    .contains("valores_ids", [valorId]);

  if (preciosError) throw new Error(preciosError.message);

  const { data: links, error: linksError } = await client
    .from("producto_atributo_valores")
    .select("producto_atributo_id")
    .eq("valor_id", valorId);

  if (linksError) throw new Error(linksError.message);

  const paIds = [
    ...new Set((links ?? []).map((link) => link.producto_atributo_id)),
  ];

  let productos = 0;
  let afectaPrecio = false;

  if (paIds.length > 0) {
    const { data: atributos, error: atributosError } = await client
      .from("producto_atributos")
      .select("producto_id, afecta_precio")
      .in("id", paIds);

    if (atributosError) throw new Error(atributosError.message);

    productos = new Set(
      (atributos ?? []).map((atributo) => atributo.producto_id),
    ).size;
    afectaPrecio = (atributos ?? []).some(
      (atributo) => atributo.afecta_precio,
    );
  }

  return {
    valor: valor.valor as string,
    productos,
    precios: precios ?? 0,
    afecta_precio: afectaPrecio,
  };
}

export async function eliminarValor(valorId: string) {
  await requireAdmin();

  const { data, error } = await createAdminClient().rpc(
    "eliminar_atributo_valor",
    { p_valor_id: valorId },
  );

  if (error) {
    if (esFuncionFaltante(error)) throw new Error(MENSAJE_MIGRACION);
    throw new Error(error.message);
  }

  return (data ?? {}) as {
    productos_desvinculados?: number;
    precios_bloqueantes?: number;
  };
}

export async function eliminarAtributoSeguro(id: string) {
  await requireAdmin();

  const { data, error } = await createAdminClient().rpc(
    "eliminar_atributo_seguro",
    { p_atributo_id: id },
  );

  if (error) {
    if (esFuncionFaltante(error)) throw new Error(MENSAJE_MIGRACION);
    throw new Error(error.message);
  }

  return (data ?? {}) as {
    productos_desvinculados?: number;
    precios_bloqueantes?: number;
  };
}
