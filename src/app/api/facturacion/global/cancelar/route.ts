import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cancelarCFDI,
  MOTIVOS_CANCELACION,
} from "@/lib/services/facturemosyaCancelacion";
import { formatearErrorCancelacion } from "@/lib/services/facturemosyaErrores";

const ROLES_PERMITIDOS = ["admin", "superadmin", "contador"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Configuración de Supabase faltante" },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // no-op en API route
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profile || !ROLES_PERMITIDOS.includes(profile.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { id?: string; motivo?: string; uuidRelacionado?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const id = body?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "id de factura global requerido" },
      { status: 400 },
    );
  }

  const motivo = body?.motivo;
  if (!motivo || !MOTIVOS_CANCELACION.includes(motivo as never)) {
    return NextResponse.json(
      { error: "motivo inválido (debe ser 01, 02, 03 o 04)" },
      { status: 400 },
    );
  }

  let uuidRelacionado = "";
  if (motivo === "01") {
    uuidRelacionado = (body?.uuidRelacionado ?? "").trim();
    if (!uuidRelacionado) {
      return NextResponse.json(
        { error: "uuidRelacionado requerido para el motivo 01" },
        { status: 400 },
      );
    }
    if (!UUID_RE.test(uuidRelacionado)) {
      return NextResponse.json(
        { error: "uuidRelacionado inválido" },
        { status: 400 },
      );
    }
  }

  const admin = createAdminClient();

  const { data: global, error: globalErr } = await admin
    .from("facturas_globales")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (globalErr) {
    return NextResponse.json(
      { error: "Error al consultar la factura global" },
      { status: 500 },
    );
  }

  if (!global) {
    return NextResponse.json(
      { error: "Factura global no encontrada" },
      { status: 404 },
    );
  }

  if (global.estado === "cancelada") {
    return NextResponse.json({
      success: true,
      yaCancelada: true,
      estado: "cancelada",
    });
  }

  if (!global.uuid || global.estado !== "emitida") {
    return NextResponse.json(
      { error: "La factura global no está emitida o no tiene UUID" },
      { status: 400 },
    );
  }

  let respuesta;
  try {
    respuesta = await cancelarCFDI(
      {
        url:
          process.env.FACTUREMOSYA_CANCELACION_URL ||
          "https://www.facturemosya.com/webservice/wsCancelarCFDI22.php",
        usuario: process.env.FACTUREMOSYA_USUARIO || "democfdi",
        password: process.env.FACTUREMOSYA_PASSWORD || "demo2011",
      },
      global.uuid,
      motivo,
      uuidRelacionado,
    );
  } catch (err) {
    console.error("FacturemosYa cancelar factura global error:", err);
    const mensaje =
      err instanceof Error ? err.message : "Error de conexión con FacturemosYa";
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }

  if (respuesta.codigo === "201") {
    await admin
      .from("facturas_globales")
      .update({
        estado: "cancelada",
        cancelacion_motivo: motivo,
        cancelacion_fecha: new Date().toISOString(),
        cancelacion_acuse: respuesta.descripcion,
        cancelacion_pendiente_desde: null,
      })
      .eq("id", global.id);

    await admin
      .from("pedidos")
      .update({
        factura_global_id: null,
        factura_global_incluida_en: null,
      })
      .eq("factura_global_id", global.id);

    return NextResponse.json({
      success: true,
      estado: "cancelada",
      descripcion: respuesta.descripcion,
      fecha: respuesta.fecha,
    });
  }

  if (respuesta.codigo === "2001") {
    await admin
      .from("facturas_globales")
      .update({
        estado: "cancelacion_pendiente",
        cancelacion_motivo: motivo,
        cancelacion_acuse: respuesta.descripcion,
        cancelacion_pendiente_desde: new Date().toISOString(),
      })
      .eq("id", global.id);

    return NextResponse.json({
      success: true,
      estado: "cancelacion_pendiente",
      descripcion: respuesta.descripcion,
      fecha: respuesta.fecha,
    });
  }

  console.error(
    "FacturemosYa cancelación global con error:",
    respuesta.codigo,
    respuesta.descripcion,
    "factura global",
    global.id,
  );

  return NextResponse.json(
    {
      error: formatearErrorCancelacion(
        respuesta.codigo,
        respuesta.descripcion,
      ),
    },
    { status: 502 },
  );
}
