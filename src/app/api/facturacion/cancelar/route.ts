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
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
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

  let principal: Record<string, unknown> | null = null;

  const { data: porNumero } = await admin
    .from("pedidos")
    .select("*")
    .eq("numero_pedido", id)
    .maybeSingle();

  if (porNumero) {
    principal = porNumero as unknown as Record<string, unknown>;
  } else if (UUID_RE.test(id)) {
    const { data: porId } = await admin
      .from("pedidos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    principal = (porId as unknown as Record<string, unknown>) ?? null;
  }

  if (!principal) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const uuid = principal.factura_uuid as string | null;
  if (!uuid) {
    return NextResponse.json(
      { error: "El pedido no tiene una factura emitida" },
      { status: 400 },
    );
  }

  const clave =
    (principal.factura_numero as string | null) ??
    (principal.numero_pedido as string | null);

  const ids =
    (principal.factura_numero as string | null)
      ? ((await admin
          .from("pedidos")
          .select("id")
          .eq("factura_numero", principal.factura_numero as string)
          .then((r) => (r.data ?? []).map((p) => p.id))) as string[])
      : [principal.id as string];

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
      uuid,
      motivo,
      uuidRelacionado,
    );
  } catch (err) {
    console.error("FacturemosYa cancelarCFDI error:", err);
    const mensaje =
      err instanceof Error ? err.message : "Error de conexión con FacturemosYa";
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }

  if (respuesta.codigo === "201") {
    await admin
      .from("pedidos")
      .update({
        factura_estado: "cancelada",
        factura_cancelacion_motivo: motivo,
        factura_cancelacion_fecha: new Date().toISOString(),
        factura_cancelacion_acuse: respuesta.descripcion,
      })
      .in("id", ids);

    return NextResponse.json({
      success: true,
      estado: "cancelada",
      descripcion: respuesta.descripcion,
      fecha: respuesta.fecha,
    });
  }

  if (respuesta.codigo === "2001") {
    await admin
      .from("pedidos")
      .update({
        factura_estado: "cancelacion_pendiente",
        factura_cancelacion_motivo: motivo,
        factura_cancelacion_acuse: respuesta.descripcion,
      })
      .in("id", ids);

    return NextResponse.json({
      success: true,
      estado: "cancelacion_pendiente",
      descripcion: respuesta.descripcion,
      fecha: respuesta.fecha,
    });
  }

  console.error(
    "FacturemosYa cancelación con error:",
    respuesta.codigo,
    respuesta.descripcion,
    "pedido",
    clave,
  );
  const mensaje = formatearErrorCancelacion(
    respuesta.codigo,
    respuesta.descripcion,
  );
  return NextResponse.json({ error: mensaje }, { status: 502 });
}
