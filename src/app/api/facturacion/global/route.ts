import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  construirDocumentoTxt,
  desglosarTotales,
} from "@/lib/services/facturacion";
import {
  calcularPeriodo,
  construirLineasGlobal,
  contarPedidosGlobal,
  filtrarPedidosGlobal,
} from "@/lib/services/facturacionGlobal";
import { timbrarTxt } from "@/lib/services/facturemosya";
import { formatearErrorFacturemosya } from "@/lib/services/facturemosyaErrores";
import { subirFacturaAStorage } from "@/lib/services/facturaStorage";
import {
  enviarFacturaGlobalPorCorreo,
  type AdjuntoCorreo,
} from "@/lib/services/email";
import { resolverConfigFacturacion } from "@/lib/services/facturacionConfig";
import type { EntidadEmisora, Pedido } from "@/lib/supabase/types";
import {
  facturacionHabilitada,
  MENSAJE_FACTURACION_DESHABILITADA,
} from "@/lib/config/features";

const ROLES_PERMITIDOS = ["contador", "admin", "superadmin"];

function extraerUUID(timbrefiscal?: string): string {
  if (!timbrefiscal) return "";
  const partes = timbrefiscal.split("|");
  return partes[1] ?? "";
}

export async function POST(request: NextRequest) {
  if (!facturacionHabilitada()) {
    return NextResponse.json(
      { error: MENSAJE_FACTURACION_DESHABILITADA },
      { status: 503 },
    );
  }

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

  let body: { periodo?: string; entidad_emisora_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const periodo = body?.periodo;
  if (!periodo || typeof periodo !== "string") {
    return NextResponse.json(
      { error: "El periodo es requerido (formato YYYY-MM)" },
      { status: 400 },
    );
  }

  const entidadEmisoraId = body?.entidad_emisora_id;
  if (!entidadEmisoraId || typeof entidadEmisoraId !== "string") {
    return NextResponse.json(
      { error: "La razón social / sucursal es requerida" },
      { status: 400 },
    );
  }

  const info = calcularPeriodo(periodo);
  if (!info) {
    return NextResponse.json(
      { error: "Periodo inválido. Usa el formato YYYY-MM" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: entidadData } = await admin
    .from("entidades_emisoras")
    .select("*")
    .eq("id", entidadEmisoraId)
    .eq("activo", true)
    .maybeSingle();

  const entidad = (entidadData as EntidadEmisora | null) ?? null;
  if (!entidad) {
    return NextResponse.json(
      { error: "Entidad emisora no encontrada o inactiva" },
      { status: 400 },
    );
  }

  const configFacturacion = resolverConfigFacturacion(entidad);

  const { data, error } = await admin
    .from("pedidos")
    .select("*, detalle_pedidos(*)")
    .eq("entidad_emisora_id", entidad.id)
    .gte("fecha_pago_total", info.desdeISO)
    .lt("fecha_pago_total", info.hastaISO)
    .is("factura_uuid", null)
    .is("factura_global_id", null)
    .neq("estado", "cancelado");

  if (error) {
    console.error("Error al consultar pedidos para factura global:", error);
    return NextResponse.json(
      { error: "Error al consultar los pedidos del periodo" },
      { status: 500 },
    );
  }

  const pedidos = filtrarPedidosGlobal(
    (data ?? []) as unknown as Pedido[],
    info,
  );

  const lineas = construirLineasGlobal(pedidos);
  if (lineas.length === 0) {
    return NextResponse.json(
      {
        error:
          "No hay pedidos pagados sin RFC pendientes de incluir en la factura global del periodo.",
      },
      { status: 400 },
    );
  }

  const totales = desglosarTotales(lineas, 0.16);
  const pedidosCount = contarPedidosGlobal(pedidos);

  const { data: folioData, error: folioErr } =
    await admin.rpc("generar_folio_factura_entidad", {
      p_entidad_id: entidad.id,
    });
  if (folioErr) {
    return NextResponse.json(
      { error: "No se pudo generar el folio de la factura global" },
      { status: 500 },
    );
  }

  const folio = String(folioData ?? Date.now());
  const serie = configFacturacion.serie;

  const { data: registro, error: registroErr } = await admin
    .from("facturas_globales")
    .insert({
      periodo: info.periodo,
      fecha_desde: info.desde,
      fecha_hasta: info.hasta,
      entidad_emisora_id: entidad.id,
      folio,
      serie,
      estado: "pendiente",
      subtotal: totales.subtotal,
      iva: totales.iva,
      total: totales.total,
      pedidos_count: pedidosCount,
      created_by: user.id,
    })
    .select()
    .single();

  if (registroErr || !registro) {
    console.error("Error al registrar factura global:", registroErr);
    return NextResponse.json(
      { error: "No se pudo registrar la factura global" },
      { status: 500 },
    );
  }

  const documento = construirDocumentoTxt(
    lineas,
    {
      tasaIVA: 0.16,
      regimenEmisor: configFacturacion.regimenEmisor,
      cpExpedicion: configFacturacion.cpExpedicion,
      folio,
      serie,
      formaPago: "99",
      metodoPago: "PUE",
      global: true,
      periodoGlobal: { mes: info.mes, anio: info.anio },
    },
    new Date(),
  );

  let respuesta;
  try {
    respuesta = await timbrarTxt(
      {
        url: configFacturacion.url,
        usuario: configFacturacion.usuario,
        password: configFacturacion.password,
      },
      documento,
      "0",
    );
  } catch (err) {
    console.error("FacturemosYa factura global error:", err);
    const mensaje =
      err instanceof Error ? err.message : "Error de conexión con FacturemosYa";
    await admin
      .from("facturas_globales")
      .update({ estado: "error", error: mensaje })
      .eq("id", registro.id);
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }

  if (respuesta.codigo !== "201") {
    console.error(
      "FacturemosYa factura global con error:",
      respuesta.codigo,
      respuesta.descripcion,
    );
    const mensaje = formatearErrorFacturemosya(
      respuesta.codigo,
      respuesta.descripcion,
    );
    await admin
      .from("facturas_globales")
      .update({ estado: "error", error: mensaje })
      .eq("id", registro.id);
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }

  const uuid = extraerUUID(respuesta.timbrefiscal);
  const { xmlUrl, pdfUrl } = await subirFacturaAStorage(
    admin,
    uuid,
    respuesta.descripcion,
    respuesta.documentopdf,
    "global-",
  );

  const { error: updateErr } = await admin
    .from("facturas_globales")
    .update({
      uuid,
      xml_url: xmlUrl,
      pdf_url: pdfUrl,
      estado: "emitida",
      error: null,
    })
    .eq("id", registro.id);

  if (updateErr) {
    console.error("Error al actualizar factura global:", updateErr);
  }

  const ids = pedidos.map((pedido) => pedido.id);
  const { error: pedidosErr } = await admin
    .from("pedidos")
    .update({
      factura_global_id: registro.id,
      factura_global_incluida_en: new Date().toISOString(),
    })
    .in("id", ids);

  if (pedidosErr) {
    console.error("Error al vincular pedidos a la factura global:", pedidosErr);
  }

  let emailEnviado = false;
  let emailError: string | null = null;
  const contadorEmail =
    process.env.CONTADOR_EMAIL || process.env.FACTURACION_EMAIL;

  if (contadorEmail) {
    try {
      const adjuntos: AdjuntoCorreo[] = [];
      if (respuesta.documentopdf) {
        adjuntos.push({
          filename: `factura-global-${info.periodo}.pdf`,
          content: respuesta.documentopdf,
          contentType: "application/pdf",
        });
      }
      if (respuesta.descripcion) {
        adjuntos.push({
          filename: `factura-global-${info.periodo}.xml`,
          content: Buffer.from(respuesta.descripcion).toString("base64"),
          contentType: "application/xml",
        });
      }

      await enviarFacturaGlobalPorCorreo({
        to: contadorEmail,
        periodo: info.periodo,
        folio,
        uuid,
        total: totales.total,
        pedidosCount,
        pdfUrl,
        xmlUrl,
        emisorNombre: entidad.nombre_comercial,
        adjuntos,
      });
      emailEnviado = true;
    } catch (err) {
      emailError =
        err instanceof Error
          ? err.message
          : "Error al enviar la factura global por correo";
      console.error("Error al enviar factura global por correo:", err);
    }
  } else {
    emailError = "Correo del contador no configurado (CONTADOR_EMAIL).";
  }

  return NextResponse.json({
    success: true,
    id: registro.id,
    uuid,
    xmlUrl,
    pdfUrl,
    folio,
    total: totales.total,
    pedidosCount,
    emailEnviado,
    emailError,
  });
}
