import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { obtenerAutorizadorPorId } from "@/lib/services/autorizadoresCancelacion";
import { notificarCancelacionAdministradores } from "@/lib/services/cancelacionNotificaciones";
import { resolverBaseUrl } from "@/lib/utils/baseUrl";
import {
  MOTIVOS_CANCELACION_PEDIDO,
  etiquetaMotivoCancelacion,
  montoPagadoPedido,
  puedeCancelarPedido,
  type MotivoCancelacionPedido,
} from "@/lib/utils/cancelacion";
import { fechaNegocio, horaNegocio } from "@/lib/utils/fechas";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MOTIVOS = MOTIVOS_CANCELACION_PEDIDO.map((motivo) => motivo.value);

const ROLES_ADMIN = new Set(["admin", "superadmin"]);

const MAX_INTENTOS_FALLIDOS = 5;
const VENTANA_INTENTOS_MS = 15 * 60 * 1000;

function mensajeErrorAutorizacion(
  error: { code?: string; status?: number; message?: string } | null,
): string {
  const codigo = error?.code ?? "";
  const mensaje = error?.message?.toLowerCase() ?? "";

  if (codigo === "invalid_credentials") {
    return "Correo o contraseña incorrectos.";
  }

  if (
    error?.status === 429 ||
    codigo === "too_many_requests" ||
    codigo === "over_request_rate_limit"
  ) {
    return "Demasiados intentos. Espera unos minutos.";
  }

  if (
    codigo === "mfa_required" ||
    codigo === "insufficient_aal" ||
    mensaje.includes("mfa") ||
    mensaje.includes("aal")
  ) {
    return "La cuenta requiere verificación en dos pasos. Pide a un administrador o superadmin cancelar desde su propia sesión.";
  }

  return "No se pudo autorizar. Pide a un administrador o superadmin cancelar desde su cuenta.";
}

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

  const solicitanteId = user.id;
  const solicitanteEmail = user.email ?? user.id;

  let body: {
    id?: string;
    motivo?: string;
    notas?: string | null;
    adminId?: string;
    adminPassword?: string;
  };
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
  if (!motivo || !MOTIVOS.includes(motivo as MotivoCancelacionPedido)) {
    return NextResponse.json(
      { error: "Motivo de cancelación inválido" },
      { status: 400 },
    );
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, sucursal_id")
    .eq("id", user.id)
    .single();

  const column = UUID_RE.test(id) ? "id" : "numero_pedido";
  const { data: pedido, error: fetchErr } = await supabase
    .from("pedidos")
    .select(
      "id, numero_pedido, cliente_nombre, estado, area_actual, total, anticipo, saldo_cobrado, factura_uuid, factura_estado, factura_global_id, sucursal_id",
    )
    .eq(column, id)
    .single();

  if (fetchErr || !pedido) {
    return NextResponse.json(
      { error: "Pedido no encontrado" },
      { status: 404 },
    );
  }

  const validacion = puedeCancelarPedido(pedido, {
    rol: perfil?.rol ?? null,
    sucursal_id: perfil?.sucursal_id ?? null,
  });

  if (!validacion.permitido && !validacion.requiereAutorizacion) {
    return NextResponse.json(
      { error: validacion.razon ?? "No autorizado para cancelar ventas" },
      { status: 403 },
    );
  }

  const notas = body?.notas?.trim() || null;
  const totalVenta = Number(pedido.total ?? 0);
  const datosPedido = {
    numeroPedido: pedido.numero_pedido || pedido.id,
    clienteNombre: pedido.cliente_nombre || "Cliente",
    total: totalVenta,
    montoPagado: montoPagadoPedido({
      anticipo: Number(pedido.anticipo ?? 0),
      total: totalVenta,
      saldo_cobrado: pedido.saldo_cobrado,
    }),
  };

  async function notificarCancelacion(
    autorizadoPor: string,
    cancelados: number,
  ) {
    const baseUrl = resolverBaseUrl(new URL(request.url).origin);

    await notificarCancelacionAdministradores({
      ...datosPedido,
      motivo: etiquetaMotivoCancelacion(motivo),
      notas,
      solicitadoPor: solicitanteEmail,
      autorizadoPor,
      fecha: `${fechaNegocio()} ${horaNegocio().slice(0, 5)}`,
      cancelados,
      urlPedidos: `${baseUrl}/admin/pedidos`,
      urlTicket: `${baseUrl}/mostrador/ticket/${encodeURIComponent(datosPedido.numeroPedido)}`,
    });
  }

  if (validacion.permitido) {
    const { data, error } = await supabase.rpc("cancelar_venta", {
      p_pedido_id: pedido.id,
      p_motivo: motivo,
      p_notas: notas,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const cancelados = Number(
      (data as { cancelados?: number } | null)?.cancelados ?? 1,
    );
    await notificarCancelacion(solicitanteEmail, cancelados);

    return NextResponse.json({
      success: true,
      ...(data as object),
      autorizadoPor: solicitanteEmail,
    });
  }

  const adminId = body?.adminId?.trim();
  const adminPassword = body?.adminPassword;

  if (!adminId || !adminPassword) {
    return NextResponse.json(
      { error: "Se requiere autorización de un administrador o superadmin." },
      { status: 400 },
    );
  }

  if (!UUID_RE.test(adminId)) {
    return NextResponse.json(
      { error: "Administrador no válido." },
      { status: 403 },
    );
  }

  const inicioVentana = new Date(
    Date.now() - VENTANA_INTENTOS_MS,
  ).toISOString();
  const { count: intentosFallidos } = await supabase
    .from("cancelacion_intentos")
    .select("id", { count: "exact", head: true })
    .eq("solicitante_id", solicitanteId)
    .eq("exito", false)
    .gte("created_at", inicioVentana);

  if ((intentosFallidos ?? 0) >= MAX_INTENTOS_FALLIDOS) {
    return NextResponse.json(
      {
        error:
          "Demasiados intentos. Espera 15 minutos o pide a un administrador o superadmin que cancele desde su sesión.",
      },
      { status: 429 },
    );
  }

  const ip =
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  async function registrarIntento(exito: boolean) {
    const { error } = await supabase.from("cancelacion_intentos").insert({
      solicitante_id: solicitanteId,
      exito,
      ip,
    });

    if (error) {
      console.error(
        "No se pudo registrar el intento de cancelación:",
        error.message,
      );
    }
  }

  let admin: Awaited<ReturnType<typeof obtenerAutorizadorPorId>>;
  try {
    admin = await obtenerAutorizadorPorId(adminId);
  } catch (err) {
    console.error("No se pudo validar al administrador:", err);
    return NextResponse.json(
      { error: "No se pudo validar al administrador. Intenta de nuevo." },
      { status: 500 },
    );
  }

  if (!admin || !ROLES_ADMIN.has(admin.rol)) {
    return NextResponse.json(
      { error: "El usuario seleccionado no puede autorizar cancelaciones." },
      { status: 403 },
    );
  }

  const verificador = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const { data: signIn, error: signInError } =
      await verificador.auth.signInWithPassword({
        email: admin.email,
        password: adminPassword,
      });

    if (signInError || !signIn.user) {
      await registrarIntento(false);
      return NextResponse.json(
        { error: mensajeErrorAutorizacion(signInError) },
        { status: signInError?.status === 429 ? 429 : 401 },
      );
    }

    if (signIn.user.id !== admin.id) {
      await registrarIntento(false);
      return NextResponse.json(
        { error: "No se pudo validar al administrador." },
        { status: 403 },
      );
    }

    await registrarIntento(true);

    const notasAuditoria = [
      notas,
      `Autorizada por ${admin.email} (solicitada por ${solicitanteEmail})`,
    ]
      .filter(Boolean)
      .join(" | ");

    const { data, error } = await verificador.rpc("cancelar_venta", {
      p_pedido_id: pedido.id,
      p_motivo: motivo,
      p_notas: notasAuditoria,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const cancelados = Number(
      (data as { cancelados?: number } | null)?.cancelados ?? 1,
    );
    await notificarCancelacion(admin.email, cancelados);

    return NextResponse.json({
      success: true,
      ...(data as object),
      autorizadoPor: admin.email,
    });
  } finally {
    await verificador.auth.signOut().catch(() => undefined);
  }
}
