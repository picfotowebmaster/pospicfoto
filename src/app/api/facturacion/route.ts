import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { construirDocumentoTxt, type LineaFactura } from "@/lib/services/facturacion";
import { timbrarTxt } from "@/lib/services/facturemosya";
import { formatearErrorFacturemosya } from "@/lib/services/facturemosyaErrores";
import { enviarFacturaPorCorreo, type AdjuntoCorreo } from "@/lib/services/email";

const ROLES_PERMITIDOS = ["mostrador", "admin", "superadmin", "contador"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapearFormaPago(metodoPago: string | null | undefined): string {
  if (metodoPago === "Tarjeta") return "04";
  if (metodoPago === "Transferencia") return "03";
  return "01";
}

function extraerUUID(timbrefiscal?: string): string {
  if (!timbrefiscal) return "";
  const partes = timbrefiscal.split("|");
  return partes[1] ?? "";
}

async function subirAStorage(
  admin: ReturnType<typeof createAdminClient>,
  uuid: string,
  xml: string,
  pdfBase64: string | undefined,
): Promise<{ xmlUrl: string | null; pdfUrl: string | null }> {
  let xmlUrl: string | null = null;
  let pdfUrl: string | null = null;

  try {
    await admin.storage.createBucket("facturas", { public: true });
  } catch {
    // el bucket ya existe o no hay permisos; se intenta subir de todas formas
  }

  try {
    await admin.storage
      .from("facturas")
      .upload(`${uuid}.xml`, new TextEncoder().encode(xml), {
        contentType: "application/xml",
        upsert: true,
      });
    xmlUrl = admin.storage.from("facturas").getPublicUrl(`${uuid}.xml`).data
      .publicUrl;
  } catch {
    xmlUrl = null;
  }

  if (pdfBase64) {
    try {
      const pdfBytes = Uint8Array.from(Buffer.from(pdfBase64, "base64"));
      await admin.storage
        .from("facturas")
        .upload(`${uuid}.pdf`, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      pdfUrl = admin.storage.from("facturas").getPublicUrl(`${uuid}.pdf`).data
        .publicUrl;
    } catch {
      pdfUrl = null;
    }
  }

  return { xmlUrl, pdfUrl };
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

  if (principal.factura_uuid) {
    return NextResponse.json({
      success: true,
      uuid: principal.factura_uuid,
      xmlUrl: principal.factura_xml_url ?? null,
      pdfUrl: principal.factura_pdf_url ?? null,
      yaEmitida: true,
    });
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

  const { data: folioData } = await admin.rpc("generar_folio_factura");
  const folioFactura = String(folioData ?? Date.now());
  const serieFactura = process.env.FACTUREMOSYA_SERIE || "";

  const documento = construirDocumentoTxt(lineas, {
    tasaIVA: 0.16,
    regimenEmisor: process.env.FACTUREMOSYA_REGIMEN_EMISOR || "601",
    cpExpedicion: process.env.FACTUREMOSYA_CP_EXPEDICION || "06450",
    folio: folioFactura,
    serie: serieFactura,
    formaPago: mapearFormaPago(principal.metodo_pago as string | null),
    metodoPago: "PUE",
  });

  let respuesta;
  try {
    respuesta = await timbrarTxt(
      {
        url:
          process.env.FACTUREMOSYA_URL ||
          "https://www.facturemosya.com/webservice/timbrarCfdi4_0.php",
        usuario: process.env.FACTUREMOSYA_USUARIO || "democfdi",
        password: process.env.FACTUREMOSYA_PASSWORD || "demo2011",
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
  const { xmlUrl, pdfUrl } = await subirAStorage(
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
