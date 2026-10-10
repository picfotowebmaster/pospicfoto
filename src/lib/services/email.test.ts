import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn(function () {
    return { emails: { send: sendMock } };
  }),
}));

import { Resend } from "resend";
import { enviarFacturaPorCorreo, enviarTicketPorCorreo } from "./email";
import type { Pedido } from "@/lib/supabase/types";

const baseParams = {
  to: "cliente@correo.com",
  clienteNombre: "Juan Perez",
  numeroPedido: "PED-001",
  uuid: "uuid-123",
  pdfUrl: "https://example.com/factura.pdf",
  xmlUrl: "https://example.com/factura.xml",
};

const pedidoBase = {
  id: "pedido-id-12345678",
  numero_pedido: "PED-100",
  cliente_nombre: "Ana <script>",
  cliente_telefono: "555",
  fecha_recepcion: "2026-07-01",
  hora_recepcion: "10:00",
  fecha_entrega: "2026-07-05",
  hora_entrega: "14:00",
  metodo_pago: "Efectivo",
  subtotal: 100,
  anticipo: 70,
  total: 100,
  detalle_pedidos: [
    { id: "d1", pedido_id: "pedido-id-12345678", producto_nombre: "Foto 4x6", cantidad: 10, precio_unitario: 10, importe_linea: 100, atributos: { acabado: "mate" } },
  ],
} as unknown as Pedido;

describe("enviarFacturaPorCorreo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null, headers: null });
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "facturacion@picfoto.com";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("lanza error si falta configuración", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(enviarFacturaPorCorreo(baseParams)).rejects.toThrow(/no configurado/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("envía el correo con remitente, destinatario y asunto", async () => {
    await enviarFacturaPorCorreo(baseParams);

    expect(Resend).toHaveBeenCalledWith("test-key");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.from).toBe("facturacion@picfoto.com");
    expect(payload.to).toEqual(["cliente@correo.com"]);
    expect(payload.subject).toContain("PED-001");
    expect(payload.html).toContain("uuid-123");
    expect(payload.attachments).toBeUndefined();
  });

  it("mapea adjuntos al formato contentType del SDK", async () => {
    await enviarFacturaPorCorreo({
      ...baseParams,
      adjuntos: [
        { filename: "f.pdf", content: "pdf-b64", contentType: "application/pdf" },
        { filename: "f.xml", content: "xml-b64" },
      ],
    });

    const payload = sendMock.mock.calls[0][0];
    expect(payload.attachments).toEqual([
      { filename: "f.pdf", content: "pdf-b64", contentType: "application/pdf" },
      { filename: "f.xml", content: "xml-b64", contentType: "application/octet-stream" },
    ]);
  });

  it("propaga el error devuelto por el SDK", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key", statusCode: 401, name: "invalid_api_key" },
      headers: null,
    });

    await expect(enviarFacturaPorCorreo(baseParams)).rejects.toThrow("Invalid API key");
  });
});

describe("enviarTicketPorCorreo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ data: { id: "email-2" }, error: null, headers: null });
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "miorden@picfoto.mx";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("envía el ticket al cliente con asunto y HTML escapado", async () => {
    await enviarTicketPorCorreo({ to: "ana@correo.com", pedido: pedidoBase });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.to).toEqual(["ana@correo.com"]);
    expect(payload.subject).toContain("PED-100");
    expect(payload.subject).toContain("PIC FOTO");
    expect(payload.html).toContain("Foto 4x6");
    expect(payload.html).not.toContain("<script>");
    expect(payload.attachments).toBeUndefined();
  });

  it("propaga el error del SDK", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "boom", statusCode: 500, name: "application_error" },
      headers: null,
    });

    await expect(
      enviarTicketPorCorreo({ to: "ana@correo.com", pedido: pedidoBase }),
    ).rejects.toThrow("boom");
  });
});
