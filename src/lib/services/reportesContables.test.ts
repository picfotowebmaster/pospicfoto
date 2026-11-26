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

const pedidoAnterior = {
  ...pedido,
  id: "p2",
  numero_pedido: "PIC-PAL-00002",
  fecha_recepcion: "2026-10-28",
};

interface Resultado {
  data: unknown;
  error: unknown;
}

function crearBuilder(resultado: Resultado) {
  return {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(resultado),
  };
}

type Builder = ReturnType<typeof crearBuilder>;

function comoFrom(builder: Builder) {
  return builder as unknown as ReturnType<typeof supabase.from>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("obtenerPedidosReporte", () => {
  it("consulta por fecha de venta o fecha de cobro del saldo", async () => {
    const pedidosBuilder = crearBuilder({ data: [pedido], error: null });
    const pagosBuilder = crearBuilder({ data: [], error: null });
    vi.mocked(supabase.from).mockImplementation((tabla: string) =>
      tabla === "pagos_pedido"
        ? comoFrom(pagosBuilder)
        : comoFrom(pedidosBuilder),
    );

    const resultado = await obtenerPedidosReporte({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });

    expect(supabase.from).toHaveBeenCalledWith("pedidos");
    expect(pedidosBuilder.or).toHaveBeenCalledWith(
      "and(fecha_recepcion.gte.2026-11-01,fecha_recepcion.lte.2026-11-30),and(saldo_cobrado_en.gte.2026-11-01T00:00:00-06:00,saldo_cobrado_en.lte.2026-11-30T23:59:59.999-06:00),and(reembolso_realizado_en.gte.2026-11-01T00:00:00-06:00,reembolso_realizado_en.lte.2026-11-30T23:59:59.999-06:00)",
    );
    expect(pedidosBuilder.order).toHaveBeenCalledWith("fecha_recepcion", {
      ascending: true,
    });
    expect(pedidosBuilder.order).toHaveBeenCalledWith("id", {
      ascending: true,
    });
    expect(pedidosBuilder.range).toHaveBeenCalledWith(0, 999);
    expect(resultado).toEqual([pedido]);
  });

  it("filtra por sucursal cuando se indica", async () => {
    const pedidosBuilder = crearBuilder({ data: [pedido], error: null });
    const pagosBuilder = crearBuilder({ data: [], error: null });
    vi.mocked(supabase.from).mockImplementation((tabla: string) =>
      tabla === "pagos_pedido"
        ? comoFrom(pagosBuilder)
        : comoFrom(pedidosBuilder),
    );

    await obtenerPedidosReporte(
      { desde: "2026-11-01", hasta: "2026-11-30" },
      "suc-1",
    );

    expect(pedidosBuilder.eq).toHaveBeenCalledWith("sucursal_id", "suc-1");
    expect(pagosBuilder.eq).toHaveBeenCalledWith(
      "pedidos.sucursal_id",
      "suc-1",
    );
  });

  it("filtra por marca cuando se indica", async () => {
    const pedidosBuilder = crearBuilder({ data: [pedido], error: null });
    const pagosBuilder = crearBuilder({ data: [], error: null });
    vi.mocked(supabase.from).mockImplementation((tabla: string) =>
      tabla === "pagos_pedido"
        ? comoFrom(pagosBuilder)
        : comoFrom(pedidosBuilder),
    );

    await obtenerPedidosReporte(
      { desde: "2026-11-01", hasta: "2026-11-30" },
      "suc-1",
      "mar-1",
    );

    expect(pedidosBuilder.eq).toHaveBeenCalledWith("sucursal_id", "suc-1");
    expect(pedidosBuilder.eq).toHaveBeenCalledWith("marca_id", "mar-1");
    expect(pagosBuilder.eq).toHaveBeenCalledWith(
      "pedidos.marca_id",
      "mar-1",
    );
  });

  it("incluye pedidos con anticipo cobrado en el rango aunque su venta sea anterior", async () => {
    let llamadasPedidos = 0;
    const pedidosPrincipal = crearBuilder({ data: [], error: null });
    const pedidosExtra = crearBuilder({
      data: [pedidoAnterior],
      error: null,
    });
    const pagosBuilder = crearBuilder({
      data: [{ pedido_id: "p2" }],
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((tabla: string) => {
      if (tabla === "pagos_pedido") return comoFrom(pagosBuilder);
      llamadasPedidos += 1;
      return comoFrom(
        llamadasPedidos === 1 ? pedidosPrincipal : pedidosExtra,
      );
    });

    const resultado = await obtenerPedidosReporte({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });

    expect(pagosBuilder.gte).toHaveBeenCalledWith(
      "cobrado_en",
      "2026-11-01T00:00:00-06:00",
    );
    expect(pagosBuilder.order).toHaveBeenCalledWith("id", {
      ascending: true,
    });
    expect(pedidosExtra.in).toHaveBeenCalledWith("id", ["p2"]);
    expect(pedidosExtra.order).toHaveBeenCalledWith("id", {
      ascending: true,
    });
    expect(resultado).toEqual([pedidoAnterior]);
  });

  it("propaga errores de la consulta", async () => {
    const pedidosBuilder = crearBuilder({
      data: null,
      error: new Error("fail"),
    });
    const pagosBuilder = crearBuilder({ data: [], error: null });
    vi.mocked(supabase.from).mockImplementation((tabla: string) =>
      tabla === "pagos_pedido"
        ? comoFrom(pagosBuilder)
        : comoFrom(pedidosBuilder),
    );

    await expect(
      obtenerPedidosReporte({ desde: "2026-11-01", hasta: "2026-11-30" }),
    ).rejects.toThrow("fail");
  });
});
