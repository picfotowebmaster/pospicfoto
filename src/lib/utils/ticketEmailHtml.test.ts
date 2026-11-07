import { describe, it, expect } from "vitest";
import { renderTicketHtml } from "./ticketEmailHtml";
import type { EntidadEmisora, Pedido } from "@/lib/supabase/types";

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
    expect(html).toContain("55 5518 4687");
    expect(html).toContain("miorden@picfoto.mx");
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

  it("renderiza el emisor FRAMEX con su RFC, logo y datos", () => {
    const emisor: EntidadEmisora = {
      id: "e-frx",
      codigo: "FRX_CUB",
      nombre_comercial: "FRAMEX",
      razon_social: "Enmarcado Profesional de México",
      rfc: "EPM180424491",
      regimen_fiscal: "Régimen General Ley de Personas Morales",
      direccion: 'REPÚBLICA DE CUBA #81 LOCAL "C", CENTRO, CDMX',
      telefonos: "55 5772 6267",
      email: "ventas@framex.mx",
      sitio_web: null,
      logo_url: "/icons/framex-icon.png",
      marca_id: null,
      sucursal_id: null,
      cp_expedicion: "06010",
      serie_factura: "FRX",
      facturacion_key: "FRX",
      activo: true,
      orden: 3,
    };

    const html = renderTicketHtml(pedido, emisor, "https://pos.picfoto.mx");

    expect(html).toContain("FRAMEX");
    expect(html).toContain("Enmarcado Profesional de México");
    expect(html).toContain("EPM180424491");
    expect(html).toContain("ventas@framex.mx");
    expect(html).toContain("https://pos.picfoto.mx/icons/framex-icon.png");
  });
});
