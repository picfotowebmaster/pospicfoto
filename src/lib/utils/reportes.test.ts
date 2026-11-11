import { describe, expect, it } from "vitest";
import { construirResumenReporte, type PedidoReporte } from "./reportes";

const base: PedidoReporte = {
  fecha_recepcion: "2026-11-10",
  total: 100,
  anticipo: 0,
  metodo_pago: "Efectivo",
  saldo_cobrado: false,
  saldo_metodo_pago: null,
  saldo_cobrado_en: null,
  estado: "pendiente",
};

describe("construirResumenReporte", () => {
  it("sin anticipo pendiente suma todo como saldo pendiente", () => {
    const resumen = construirResumenReporte([base], "2026-11-01");

    expect(resumen.totalVendido).toBe(100);
    expect(resumen.totalCobrado).toBe(0);
    expect(resumen.saldoPendiente).toBe(100);
    expect(resumen.cobradoPorDia).toEqual([]);
  });

  it("con 70% cobra anticipo y saldo en fechas y métodos distintos", () => {
    const resumen = construirResumenReporte(
      [
        {
          ...base,
          anticipo: 70,
          saldo_cobrado: true,
          saldo_metodo_pago: "Tarjeta",
          saldo_cobrado_en: "2026-11-15T18:00:00.000Z",
        },
      ],
      "2026-11-01",
    );

    expect(resumen.totalCobrado).toBe(100);
    expect(resumen.saldoPendiente).toBe(0);
    expect(resumen.cobradoPorDia).toEqual([
      { fecha_recepcion: "2026-11-10", count: 1, total: 70 },
      { fecha_recepcion: "2026-11-15", count: 1, total: 30 },
    ]);
    expect(resumen.cobradoPorMetodo).toEqual([
      { metodo_pago: "Efectivo", count: 1, total: 70 },
      { metodo_pago: "Tarjeta", count: 1, total: 30 },
    ]);
  });

  it("100% cobrado no genera saldo pendiente", () => {
    const resumen = construirResumenReporte(
      [{ ...base, anticipo: 100 }],
      "2026-11-01",
    );

    expect(resumen.totalCobrado).toBe(100);
    expect(resumen.saldoPendiente).toBe(0);
  });

  it("incluye saldo de un pedido anterior cobrado en el periodo", () => {
    const resumen = construirResumenReporte(
      [
        {
          ...base,
          fecha_recepcion: "2026-10-20",
          anticipo: 70,
          saldo_cobrado: true,
          saldo_metodo_pago: "Efectivo",
          saldo_cobrado_en: "2026-11-02T10:00:00.000Z",
        },
      ],
      "2026-11-01",
    );

    expect(resumen.totalVendido).toBe(0);
    expect(resumen.totalCobrado).toBe(30);
    expect(resumen.cobradoPorDia).toEqual([
      { fecha_recepcion: "2026-11-02", count: 1, total: 30 },
    ]);
  });

  it("ignora pedidos cancelados", () => {
    const resumen = construirResumenReporte(
      [{ ...base, estado: "cancelado", anticipo: 70 }],
      "2026-11-01",
    );

    expect(resumen.totalVendido).toBe(0);
    expect(resumen.totalCobrado).toBe(0);
    expect(resumen.saldoPendiente).toBe(0);
  });
});
