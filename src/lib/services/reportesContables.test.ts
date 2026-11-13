import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase/client";
import { obtenerPedidosReporte } from "./reportesContables";

const pedido = {
  id: "p1",
  numero_pedido: "PIC-PAL-00001",
  cliente_nombre: "Cliente",
  cliente_rfc: null,
  fecha_recepcion: "2026-11-10",
  estado: "entregado",
  subtotal: 116,
  anticipo: 116,
  total: 116,
  metodo_pago: "Efectivo",
  saldo_cobrado: false,
  saldo_metodo_pago: null,
  saldo_cobrado_en: null,
  factura_folio: null,
  factura_uuid: null,
  factura_estado: null,
  factura_fecha: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("obtenerPedidosReporte", () => {
  it("consulta por fecha de venta o fecha de cobro del saldo", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [pedido], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(
      builder as unknown as ReturnType<typeof supabase.from>,
    );

    const resultado = await obtenerPedidosReporte({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });

    expect(supabase.from).toHaveBeenCalledWith("pedidos");
    expect(builder.or).toHaveBeenCalledWith(
      "and(fecha_recepcion.gte.2026-11-01,fecha_recepcion.lte.2026-11-30),and(saldo_cobrado_en.gte.2026-11-01T00:00:00-06:00,saldo_cobrado_en.lte.2026-11-30T23:59:59.999-06:00)",
    );
    expect(builder.range).toHaveBeenCalledWith(0, 999);
    expect(resultado).toEqual([pedido]);
  });

  it("propaga errores de la consulta", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error("fail") }),
    };
    vi.mocked(supabase.from).mockReturnValue(
      builder as unknown as ReturnType<typeof supabase.from>,
    );

    await expect(
      obtenerPedidosReporte({ desde: "2026-11-01", hasta: "2026-11-30" }),
    ).rejects.toThrow("fail");
  });
});
