import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  construirDocumentoTxt,
  type LineaFactura,
  type ReceptorFactura,
} from "@/lib/services/facturacion";
import { timbrarTxt } from "@/lib/services/facturemosya";
import { formatearErrorFacturemosya } from "@/lib/services/facturemosyaErrores";
import { enviarFacturaPorCorreo, type AdjuntoCorreo } from "@/lib/services/email";
import { subirFacturaAStorage } from "@/lib/services/facturaStorage";
import { resolverConfigFacturacion } from "@/lib/services/facturacionConfig";
import { pedidoPagado } from "@/lib/utils/fiscal";
import type { EntidadEmisora } from "@/lib/supabase/types";

const ROLES_PERMITIDOS = ["mostrador", "admin", "superadmin", "contador"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapearFormaPago(metodoPago: string | null | undefined): string {
  if (metodoPago === "Tarjeta") return "04";
  if (metodoPago === "Transferencia") return "03";
  return "01";
}

function mapearFormaPagoFinal(principal: Record<string, unknown>): string {
  const metodoAnticipo = principal.metodo_pago as string | null | undefined;
  const metodoSaldo = principal.saldo_metodo_pago as string | null | undefined;
  if (
    principal.saldo_cobrado &&
    metodoSaldo &&
    metodoAnticipo &&
    metodoSaldo !== metodoAnticipo
  ) {
    return "99";
  }
  return mapearFormaPago(metodoSaldo || metodoAnticipo);
}

function extraerUUID(timbrefiscal?: string): string {
  if (!timbrefiscal) return "";
  const partes = timbrefiscal.split("|");
  return partes[1] ?? "";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profile || !ROLES_PERMITIDOS.includes(profile.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const id = body?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
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

  let entidad: EntidadEmisora | null = null;
  if (principal.entidad_emisora_id) {
    const { data } = await admin
      .from("entidades_emisoras")
      .select("*")
      .eq("id", principal.entidad_emisora_id as string)
      .maybeSingle();
    entidad = (data as EntidadEmisora | null) ?? null;
  }

  const configFacturacion = resolverConfigFacturacion(entidad);

  if (principal.factura_uuid) {
    return NextResponse.json({
      success: true,
      uuid: principal.factura_uuid,
      xmlUrl: principal.factura_xml_url ?? null,
      pdfUrl: principal.factura_pdf_url ?? null,
      yaEmitida: true,
    });
  }

  if (principal.factura_global_id) {
    return NextResponse.json(
      {
        error:
          "El pedido ya está incluido en una factura global y no puede facturarse individualmente.",
      },
      { status: 400 },
    );
  }

  const clave =
    (principal.factura_numero as string | null) ??
    (principal.numero_pedido as string | null);

  if (!clave) {
    return NextResponse.json(
      { error: "El pedido no tiene número de factura" },
      { status: 400 },
    );
  }

  let pedidosData: Record<string, unknown>[] = [];
  if (principal.factura_numero) {
    const { data } = await admin
      .from("pedidos")
      .select("*, detalle_pedidos(*)")
      .eq("factura_numero", clave);
    pedidosData = (data as unknown as Record<string, unknown>[]) ?? [];
  } else {
    const { data } = await admin
      .from("pedidos")
      .select("*, detalle_pedidos(*)")
      .eq("numero_pedido", clave);
    pedidosData = (data as unknown as Record<string, unknown>[]) ?? [];
  }

  if (pedidosData.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron pedidos para facturar" },
      { status: 404 },
    );
  }

  const todosPagados = pedidosData.every((p) =>
    pedidoPagado(
      p as unknown as {
        total: number;
        anticipo: number;
        saldo_cobrado?: boolean | null;
      },
    ),
  );

  if (!todosPagados) {
    return NextResponse.json(
      {
        error:
          "El pedido debe estar pagado en su totalidad para poder facturarse.",
      },
      { status: 400 },
    );
  }

  const rfc = String(principal.cliente_rfc ?? "").trim().toUpperCase();
  const razonSocial = String(principal.cliente_razon_social ?? "").trim();
  const regimenFiscal = String(principal.cliente_regimen_fiscal ?? "").trim();
  const usoCfdi = String(principal.cliente_uso_cfdi ?? "").trim();
  const cpFiscal = String(principal.cliente_cp_fiscal ?? "").trim();

  if (!rfc) {
    return NextResponse.json(
      {
        error:
          "Sin RFC no se puede emitir factura individual; el pedido se incluirá en la factura global mensual.",
      },
      { status: 400 },
    );
  }

  if (!razonSocial || !regimenFiscal || !usoCfdi || !cpFiscal) {
    return NextResponse.json(
      {
        error:
          "Faltan datos fiscales del comprador para emitir la factura individual.",
      },
      { status: 400 },
    );
  }

  if (rfc === "XAXX010101000") {
    return NextResponse.json(
      {
        error:
          "El RFC XAXX010101000 corresponde a público en general; el pedido se incluirá en la factura global mensual.",
      },
      { status: 400 },
    );
  }

  const receptor: ReceptorFactura = {
    rfc,
    nombre: razonSocial,
    usoCfdi,
    regimenFiscal,
    cpFiscal,
  };

  const lineas: LineaFactura[] = pedidosData.flatMap((p) => {
    const detalles = (p.detalle_pedidos ?? []) as Record<string, unknown>[];
    return detalles.map((d) => ({
      producto_nombre: String(d.producto_nombre ?? ""),
      cantidad: Number(d.cantidad ?? 0),
      precio_unitario: Number(d.precio_unitario ?? 0),
    }));
  });

  if (lineas.length === 0 || lineas.some((l) => l.cantidad <= 0)) {
    return NextResponse.json(
      { error: "El pedido no tiene conceptos válidos" },
      { status: 400 },
    );
  }

  const { data: folioData } = entidad
    ? await admin.rpc("generar_folio_factura_entidad", {
        p_entidad_id: entidad.id,
      })
    : await admin.rpc("generar_folio_factura");
  const folioFactura = String(folioData ?? Date.now());
  const serieFactura = configFacturacion.serie;

  const documento = construirDocumentoTxt(lineas, {
    tasaIVA: 0.16,
    regimenEmisor: configFacturacion.regimenEmisor,
    cpExpedicion: configFacturacion.cpExpedicion,
    folio: folioFactura,
    serie: serieFactura,
    formaPago: mapearFormaPagoFinal(principal),
    metodoPago: "PUE",
    receptor,
    global: false,
  });

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
    console.error("FacturemosYa timbrarTxt error:", err);
    const mensaje =
      err instanceof Error ? err.message : "Error de conexión con FacturemosYa";
    return NextResponse.json(
      { error: mensaje },
      { status: 502 },
    );
  }

  const ids = pedidosData.map((p) => p.id as string);

  if (respuesta.codigo !== "201") {
    console.error(
      "FacturemosYa respuesta con error:",
      respuesta.codigo,
      respuesta.descripcion,
    );
    const mensaje = formatearErrorFacturemosya(
      respuesta.codigo,
      respuesta.descripcion,
    );
    await admin
      .from("pedidos")
      .update({ factura_estado: "error", factura_error: mensaje })
      .in("id", ids);
    return NextResponse.json(
      { error: mensaje },
      { status: 502 },
    );
  }

  const uuid = extraerUUID(respuesta.timbrefiscal);
  const { xmlUrl, pdfUrl } = await subirFacturaAStorage(
    admin,
    uuid,
    respuesta.descripcion,
    respuesta.documentopdf,
  );

  await admin
    .from("pedidos")
    .update({
      factura_uuid: uuid,
      factura_xml_url: xmlUrl,
      factura_pdf_url: pdfUrl,
      factura_estado: "emitida",
      factura_error: null,
      factura_fecha: new Date().toISOString(),
      factura_serie: serieFactura,
      factura_folio: folioFactura,
      entidad_emisora_id:
        entidad?.id ?? (principal.entidad_emisora_id as string | null) ?? null,
    })
    .in("id", ids);

  let emailEnviado = false;
  const clienteEmail = principal.cliente_email as string | null | undefined;
  if (clienteEmail) {
    try {
      const adjuntos: AdjuntoCorreo[] = [];
      if (respuesta.documentopdf) {
        adjuntos.push({
          filename: `${uuid}.pdf`,
          content: respuesta.documentopdf,
          contentType: "application/pdf",
        });
      }
      if (respuesta.descripcion) {
        adjuntos.push({
          filename: `${uuid}.xml`,
          content: Buffer.from(respuesta.descripcion).toString("base64"),
          contentType: "application/xml",
        });
      }

      await enviarFacturaPorCorreo({
        to: clienteEmail,
        clienteNombre: String(principal.cliente_nombre ?? "Cliente"),
        numeroPedido: String(principal.numero_pedido ?? clave),
        uuid,
        pdfUrl,
        xmlUrl,
        emisorNombre: entidad?.nombre_comercial,
        adjuntos,
      });

      await admin
        .from("pedidos")
        .update({ factura_email_enviado: new Date().toISOString() })
        .in("id", ids);

      emailEnviado = true;
      console.log(`Factura ${uuid} enviada por correo a ${clienteEmail}`);
    } catch (err) {
      console.error("Error al enviar factura por correo:", err);
    }
  }

  return NextResponse.json({ success: true, uuid, xmlUrl, pdfUrl, emailEnviado });
}
