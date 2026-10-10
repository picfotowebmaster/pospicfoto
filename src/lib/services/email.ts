import { Resend } from "resend";
import { NOMBRE_EMPRESA } from "@/lib/utils/constantes";
import { renderTicketHtml } from "@/lib/utils/ticketEmailHtml";
import type { Pedido } from "@/lib/supabase/types";

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
}

interface EnviarFacturaParams {
  to: string;
  clienteNombre: string;
  numeroPedido: string;
  uuid: string;
  pdfUrl: string | null;
  xmlUrl: string | null;
  adjuntos?: AdjuntoCorreo[];
}

interface EnviarTicketParams {
  to: string;
  pedido: Pedido;
}

async function enviarCorreo({ to, subject, html, adjuntos = [] }: EnviarCorreoParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Correo no configurado (RESEND_API_KEY / RESEND_FROM_EMAIL).");
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
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
}

export async function enviarFacturaPorCorreo({
  to,
  clienteNombre,
  numeroPedido,
  uuid,
  pdfUrl,
  xmlUrl,
  adjuntos = [],
}: EnviarFacturaParams): Promise<void> {
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
        <tr><td><strong>Pedido:</strong></td><td>${numeroPedido}</td></tr>
        <tr><td><strong>UUID:</strong></td><td>${uuid}</td></tr>
      </table>
      ${enlaces ? `<p>${enlaces}</p>` : ""}
      <p style="color:#6b7280; font-size:12px;">Adjuntamos el PDF y XML de tu factura.</p>
    </div>
  `;

  await enviarCorreo({
    to,
    subject: `Tu factura ${numeroPedido} - ${NOMBRE_EMPRESA}`,
    html,
    adjuntos,
  });
}

export async function enviarTicketPorCorreo({ to, pedido }: EnviarTicketParams): Promise<void> {
  const numeroTicket = pedido.numero_pedido || pedido.id.slice(0, 8).toUpperCase();

  await enviarCorreo({
    to,
    subject: `Tu ticket ${numeroTicket} - ${NOMBRE_EMPRESA}`,
    html: renderTicketHtml(pedido),
  });
}
