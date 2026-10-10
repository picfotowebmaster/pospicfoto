import { describe, it, expect } from "vitest";
import { renderTicketHtml } from "./ticketEmailHtml";
import type { Pedido } from "@/lib/supabase/types";

const pedido = {
  id: "abc12345-0000-0000-0000-000000000000",
  numero_pedido: "PED-50",
  cliente_nombre: 'Ana "La Jefa" <b>x</b>',
  cliente_telefono: "5551234567",
  fecha_recepcion: "2026-07-01",
  hora_recepcion: "10:00:00",
  fecha_entrega: "2026-07-05",
  hora_entrega: "14:00:00",
  metodo_pago: "Tarjeta",
  subtotal: 100,
  anticipo: 70,
  total: 100,
  detalle_pedidos: [
    {
      id: "d1",
      pedido_id: "abc12345-0000-0000-0000-000000000000",
      producto_nombre: "Foto <grande>",
      cantidad: 2,
      precio_unitario: 50,
      importe_linea: 100,
      atributos: { acabado: "mate & brillante" },
    },
  ],
} as unknown as Pedido;

describe("renderTicketHtml", () => {
  it("incluye datos del pedido y totales", () => {
    const html = renderTicketHtml(pedido);
    expect(html).toContain("PED-50");
    expect(html).toContain("$100.00");
    expect(html).toContain("Tarjeta");
    expect(html).toContain("Foto");
  });

  it("escapa el contenido dinámico para evitar inyección HTML", () => {
    const html = renderTicketHtml(pedido);
    expect(html).not.toContain("<grande>");
    expect(html).toContain("&lt;grande&gt;");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&amp;");
  });

  it("usa las políticas configuradas", () => {
    const html = renderTicketHtml(pedido);
    expect(html).toContain("30 días");
  });
});
