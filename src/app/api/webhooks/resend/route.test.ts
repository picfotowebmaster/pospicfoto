import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { verifyMock, upsertMock } = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(function () {
    return { webhooks: { verify: verifyMock } };
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(function () {
    return { from: () => ({ upsert: upsertMock }) };
  }),
}));

import { POST } from "./route";

const eventoDelayed = {
  type: "email.delivery_delayed",
  created_at: "2026-11-12T10:00:00.000Z",
  data: {
    email_id: "email-123",
    to: ["cliente@correo.com"],
    subject: "Tu ticket",
  },
};

function crearRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    body: JSON.stringify(eventoDelayed),
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_1",
      "svix-timestamp": "1700000000",
      "svix-signature": "firma",
      ...headers,
    },
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({ error: null });
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  it("responde 500 si falta configuración", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;

    const res = await POST(crearRequest());

    expect(res.status).toBe(500);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("responde 401 si faltan las cabeceras de firma", async () => {
    const req = new Request("http://localhost/api/webhooks/resend", {
      method: "POST",
      body: "{}",
    }) as unknown as Parameters<typeof POST>[0];

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("responde 401 si la firma es inválida", async () => {
    verifyMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const res = await POST(crearRequest());

    expect(res.status).toBe(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("guarda el evento válido de forma idempotente", async () => {
    verifyMock.mockReturnValue(eventoDelayed);

    const res = await POST(crearRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    expect(upsertMock).toHaveBeenCalledWith(
      {
        event_id: "msg_1",
        resend_email_id: "email-123",
        tipo: "email.delivery_delayed",
        destinatario: "cliente@correo.com",
        payload: eventoDelayed,
      },
      { onConflict: "event_id", ignoreDuplicates: true },
    );
  });

  it("ignora eventos que no son de correo", async () => {
    verifyMock.mockReturnValue({
      type: "contact.created",
      created_at: "2026-11-12T10:00:00.000Z",
      data: { id: "contact_1" },
    });

    const res = await POST(crearRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      received: true,
      ignored: true,
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("responde 500 si falla el guardado", async () => {
    verifyMock.mockReturnValue(eventoDelayed);
    upsertMock.mockResolvedValue({ error: { message: "db error" } });

    const res = await POST(crearRequest());

    expect(res.status).toBe(500);
  });
});
