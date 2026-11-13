import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import type { WebhookEventPayload } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const EVENTOS_PERSISTIDOS = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
]);

interface DatosEventoEmail {
  email_id?: string;
  to?: string[];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    console.error(
      "Webhook de Resend no configurado (RESEND_API_KEY / RESEND_WEBHOOK_SECRET).",
    );
    return NextResponse.json(
      { error: "Webhook no configurado" },
      { status: 500 },
    );
  }

  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Firma faltante" }, { status: 401 });
  }

  const payload = await request.text();

  let evento: WebhookEventPayload;
  try {
    const resend = new Resend(apiKey);
    evento = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  if (!EVENTOS_PERSISTIDOS.has(evento.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const datos = evento.data as DatosEventoEmail;
  const resendEmailId = datos?.email_id ?? null;
  const destinatario = Array.isArray(datos?.to) ? datos.to[0] ?? null : null;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("email_eventos").upsert(
      {
        event_id: id,
        resend_email_id: resendEmailId,
        tipo: evento.type,
        destinatario,
        payload: evento,
      },
      { onConflict: "event_id", ignoreDuplicates: true },
    );

    if (error) {
      console.error("Error al guardar evento de Resend:", error.message);
      return NextResponse.json(
        { error: "No se pudo guardar el evento" },
        { status: 500 },
      );
    }
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    console.error("Error al guardar evento de Resend:", detalle);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  if (evento.type === "email.delivery_delayed") {
    console.warn(
      `Correo con entrega demorada (${resendEmailId ?? "sin id"}) para ${destinatario ?? "destinatario desconocido"}.`,
    );
  }

  if (evento.type === "email.bounced" || evento.type === "email.failed") {
    console.error(
      `Correo no entregado (${evento.type}) (${resendEmailId ?? "sin id"}) para ${destinatario ?? "destinatario desconocido"}.`,
    );
  }

  return NextResponse.json({ received: true });
}
