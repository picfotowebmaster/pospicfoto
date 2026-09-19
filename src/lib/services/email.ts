import { NOMBRE_EMPRESA } from "@/lib/utils/constantes";

export interface AdjuntoCorreo {
  filename: string;
  content: string;
  contentType?: string;
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

export async function enviarFacturaPorCorreo({
  to,
  clienteNombre,
  numeroPedido,
  uuid,
  pdfUrl,
  xmlUrl,
  adjuntos = [],
}: EnviarFacturaParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Correo no configurado (RESEND_API_KEY / RESEND_FROM_EMAIL).");
  }

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

  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject: `Tu factura ${numeroPedido} - ${NOMBRE_EMPRESA}`,
    html,
  };

  if (adjuntos.length > 0) {
    body.attachments = adjuntos.map((a) => ({
      filename: a.filename,
      content: a.content,
      content_type: a.contentType || "application/octet-stream",
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Error al enviar correo (${res.status})${detalle ? `: ${detalle.slice(0, 300)}` : ""}`);
  }
}
