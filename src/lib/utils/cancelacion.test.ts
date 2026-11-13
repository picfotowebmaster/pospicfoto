import { describe, expect, it } from "vitest";
import {
  etiquetaMotivoCancelacion,
  montoPagadoPedido,
  puedeCancelarPedido,
  tieneCfdiVigente,
} from "./cancelacion";

const base = {
  estado: "pendiente",
  area_actual: "mostrador",
  factura_uuid: null,
  factura_estado: null,
  factura_global_id: null,
  sucursal_id: "suc-1",
};

describe("tieneCfdiVigente", () => {
  it("detecta factura emitida no cancelada", () => {
    expect(
      tieneCfdiVigente({ factura_uuid: "uuid-1", factura_estado: "emitida" }),
    ).toBe(true);
  });

  it("permite factura cancelada", () => {
    expect(
      tieneCfdiVigente({ factura_uuid: "uuid-1", factura_estado: "cancelada" }),
    ).toBe(false);
  });

  it("bloquea si está en factura global", () => {
    expect(tieneCfdiVigente({ factura_global_id: "global-1" })).toBe(true);
  });
});

describe("montoPagadoPedido", () => {
  it("suma anticipo y saldo cobrado", () => {
    expect(
      montoPagadoPedido({ anticipo: 100, total: 300, saldo_cobrado: true }),
    ).toBe(300);
  });

  it("solo considera el anticipo si no se cobró saldo", () => {
    expect(montoPagadoPedido({ anticipo: 100, total: 300 })).toBe(100);
  });
});

describe("puedeCancelarPedido", () => {
  it("mostrador cancela pendientes en mostrador de su sucursal", () => {
    expect(
      puedeCancelarPedido(base, { rol: "mostrador", sucursal_id: "suc-1" }),
    ).toEqual({ permitido: true });
  });

  it("mostrador no cancela pedidos ya en producción", () => {
    const resultado = puedeCancelarPedido(
      { ...base, area_actual: "diseno" },
      { rol: "mostrador", sucursal_id: "suc-1" },
    );
    expect(resultado.permitido).toBe(false);
  });

  it("mostrador no cancela de otra sucursal", () => {
    const resultado = puedeCancelarPedido(base, {
      rol: "mostrador",
      sucursal_id: "suc-2",
    });
    expect(resultado.permitido).toBe(false);
  });

  it("mostrador sin sucursal asignada no puede cancelar", () => {
    expect(
      puedeCancelarPedido(base, { rol: "mostrador" }).permitido,
    ).toBe(false);
  });

  it("admin cancela pedidos en producción pero no entregados", () => {
    expect(
      puedeCancelarPedido(
        { ...base, area_actual: "impresion", estado: "en_taller" },
        { rol: "admin" },
      ),
    ).toEqual({ permitido: true });

    expect(
      puedeCancelarPedido({ ...base, estado: "entregado" }, { rol: "admin" })
        .permitido,
    ).toBe(false);
  });

  it("superadmin cancela entregados", () => {
    expect(
      puedeCancelarPedido({ ...base, estado: "entregado" }, { rol: "superadmin" }),
    ).toEqual({ permitido: true });
  });

  it("nadie cancela con CFDI vigente", () => {
    const pedido = { ...base, factura_uuid: "uuid-1", factura_estado: "emitida" };
    expect(puedeCancelarPedido(pedido, { rol: "superadmin" }).permitido).toBe(
      false,
    );
  });

  it("roles no autorizados no cancelan", () => {
    expect(puedeCancelarPedido(base, { rol: "diseno" }).permitido).toBe(false);
    expect(puedeCancelarPedido(base, { rol: "taller" }).permitido).toBe(false);
    expect(puedeCancelarPedido(base, { rol: null }).permitido).toBe(false);
  });

  it("venta ya cancelada no se vuelve a cancelar", () => {
    expect(
      puedeCancelarPedido(
        { ...base, estado: "cancelado" },
        { rol: "superadmin" },
      ).permitido,
    ).toBe(false);
  });
});

describe("etiquetaMotivoCancelacion", () => {
  it("traduce motivos conocidos y conserva desconocidos", () => {
    expect(etiquetaMotivoCancelacion("cliente_cancela")).toBe("Cliente canceló");
    expect(etiquetaMotivoCancelacion("otro_motivo")).toBe("otro_motivo");
    expect(etiquetaMotivoCancelacion(null)).toBe("Sin motivo");
  });
});
