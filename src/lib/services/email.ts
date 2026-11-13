import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOMBRE_EMPRESA } from "@/lib/utils/constantes";
import { renderTicketHtml } from "@/lib/utils/ticketEmailHtml";
import type { EntidadEmisora, Pedido } from "@/lib/supabase/types";

export type TipoEnvioCorreo = "ticket" | "factura" | "factura_global" | "otro";

export interface AdjuntoCorreo {
  filename: string;
  content: string;
  contentType?: string;
}

interface EnviarCorreoParams {
  to: string;
  subject: string;
  html: string;
  adjuntos?: AdjuntoCorreo[];
  tipo?: TipoEnvioCorreo;
  referenciaId?: string | null;
}

interface EnviarFacturaParams {
  to: string;
  clienteNombre: string;
  numeroPedido: string;
  uuid: string;
  pdfUrl: string | null;
  xmlUrl: string | null;
  emisorNombre?: string;
  adjuntos?: AdjuntoCorreo[];
}

interface EnviarTicketParams {
  to: string;
  pedido: Pedido;
  emisor?: EntidadEmisora | null;
  baseUrl?: string;
  urlTicket?: string | null;
}

interface EnviarFacturaGlobalParams {
  to: string;
  periodo: string;
  folio: string;
  uuid: string;
  total: number;
  pedidosCount: number;
  pdfUrl: string | null;
  xmlUrl: string | null;
  emisorNombre?: string;
  adjuntos?: AdjuntoCorreo[];
}

interface RegistrarEnvioParams {
  resendEmailId: string;
  tipo: TipoEnvioCorreo;
  referenciaId?: string | null;
  destinatario: string;
  asunto: string;
}

async function registrarEnvio({
  resendEmailId,
  tipo,
  referenciaId,
  destinatario,
  asunto,
}: RegistrarEnvioParams): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("email_envios").insert({
      resend_email_id: resendEmailId,
      tipo,
      referencia_id: referenciaId ?? null,
      destinatario,
      asunto,
    });

    if (error) {
      console.warn("No se pudo registrar el envío de correo:", error.message);
    }
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    console.warn("No se pudo registrar el envío de correo:", detalle);
  }
}

async function enviarCorreo({
  to,
  subject,
  html,
  adjuntos = [],
  tipo = "otro",
  referenciaId = null,
}: EnviarCorreoParams): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Correo no configurado (RESEND_API_KEY / RESEND_FROM_EMAIL).");
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
    attachments:
      adjuntos.length > 0
        ? adjuntos.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType || "application/octet-stream",
          }))
        : undefined,
  });

  if (error) {
    throw new Error(
      `Error al enviar correo (${error.statusCode ?? "?"}): ${error.message || error.name}`,
    );
  }

  const resendEmailId = data?.id ?? null;
  if (resendEmailId) {
    await registrarEnvio({
      resendEmailId,
      tipo,
      referenciaId,
      destinatario: to,
      asunto: subject,
    });
  }

  return resendEmailId;
}

export async function enviarFacturaPorCorreo({
  to,
  clienteNombre,
  numeroPedido,
  uuid,
  pdfUrl,
  xmlUrl,
  emisorNombre,
  adjuntos = [],
}: EnviarFacturaParams): Promise<string | null> {
  const enlaces = [
    pdfUrl ? `<a href="${pdfUrl}">Descargar PDF</a>` : "",
    xmlUrl ? `<a href="${xmlUrl}">Ver XML</a>` : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
      <h2 style="margin:0 0 8px;">Factura emitida</h2>
      <p>Hola ${clienteNombre}, tu factura ha sido emitida correctamente.</p>
      <table style="font-size:14px; margin:12px 0;">
        ${emisorNombre ? `<tr><td><strong>Emisor:</strong></td><td>${emisorNombre}</td></tr>` : ""}
        <tr><td><strong>Pedido:</strong></td><td>${numeroPedido}</td></tr>
        <tr><td><strong>UUID:</strong></td><td>${uuid}</td></tr>
      </table>
      ${enlaces ? `<p>${enlaces}</p>` : ""}
      <p style="color:#6b7280; font-size:12px;">Adjuntamos el PDF y XML de tu factura.</p>
    </div>
  `;

  return enviarCorreo({
    to,
    subject: `Tu factura ${numeroPedido} - ${emisorNombre || NOMBRE_EMPRESA}`,
    html,
    adjuntos,
    tipo: "factura",
    referenciaId: uuid,
  });
}

export async function enviarFacturaGlobalPorCorreo({
  to,
  periodo,
  folio,
  uuid,
  total,
  pedidosCount,
  pdfUrl,
  xmlUrl,
  emisorNombre,
  adjuntos = [],
}: EnviarFacturaGlobalParams): Promise<string | null> {
  const enlaces = [
    pdfUrl ? `<a href="${pdfUrl}">Descargar PDF</a>` : "",
    xmlUrl ? `<a href="${xmlUrl}">Ver XML</a>` : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
      <h2 style="margin:0 0 8px;">Factura global emitida</h2>
      <p>Se emitió la factura global correspondiente al periodo <strong>${periodo}</strong>.</p>
      <table style="font-size:14px; margin:12px 0;">
        ${emisorNombre ? `<tr><td><strong>Emisor:</strong></td><td>${emisorNombre}</td></tr>` : ""}
        <tr><td><strong>Periodo:</strong></td><td>${periodo}</td></tr>
        <tr><td><strong>Folio:</strong></td><td>${folio}</td></tr>
        <tr><td><strong>Tickets:</strong></td><td>${pedidosCount}</td></tr>
        <tr><td><strong>Total:</strong></td><td>$${total.toFixed(2)}</td></tr>
        <tr><td><strong>UUID:</strong></td><td>${uuid}</td></tr>
      </table>
      ${enlaces ? `<p>${enlaces}</p>` : ""}
      <p style="color:#6b7280; font-size:12px;">Adjuntamos el PDF y XML de la factura global.</p>
    </div>
  `;

  return enviarCorreo({
    to,
    subject: `Factura global ${periodo} - ${emisorNombre || NOMBRE_EMPRESA}`,
    html,
    adjuntos,
    tipo: "factura_global",
    referenciaId: folio,
  });
}

export async function enviarTicketPorCorreo({
  to,
  pedido,
  emisor,
  baseUrl,
  urlTicket,
}: EnviarTicketParams): Promise<string | null> {
  const numeroTicket = pedido.numero_pedido || pedido.id.slice(0, 8).toUpperCase();
  const nombreEmisor = emisor?.nombre_comercial || NOMBRE_EMPRESA;

  return enviarCorreo({
    to,
    subject: `Tu ticket ${numeroTicket} - ${nombreEmisor}`,
    html: renderTicketHtml(pedido, emisor, baseUrl, urlTicket),
    tipo: "ticket",
    referenciaId: pedido.id,
  });
}
