import { describe, expect, it } from "vitest";
import {
  construirReporteContable,
  type PedidoReporteContable,
} from "./reportesContables";

function pedido(
  overrides: Partial<PedidoReporteContable> = {},
): PedidoReporteContable {
  return {
    id: "p1",
    numero_pedido: "PIC-PAL-00001",
    cliente_nombre: "Jessica Herrera",
    cliente_rfc: "XAXX010101000",
    cajero_id: "v1",
    fecha_recepcion: "2026-11-10",
    estado: "entregado",
    subtotal: 116,
    anticipo: 58,
    total: 116,
    metodo_pago: "Tarjeta",
    saldo_cobrado: false,
    saldo_metodo_pago: null,
    saldo_cobrado_en: null,
    saldo_cobrado_por: null,
    factura_folio: null,
    factura_uuid: null,
    factura_estado: null,
    ...overrides,
  };
}

const NOVIEMBRE = { desde: "2026-11-01", hasta: "2026-11-30" };
const DICIEMBRE = { desde: "2026-12-01", hasta: "2026-12-31" };

describe("construirReporteContable", () => {
  it("separa vendido y anticipo cobrado", () => {
    const reporte = construirReporteContable([pedido()], NOVIEMBRE);

    expect(reporte.totalVendido).toBe(116);
    expect(reporte.totalCobrado).toBe(58);
    expect(reporte.saldoPendiente).toBe(58);
    expect(reporte.totalPedidos).toBe(1);
    expect(reporte.ticketPromedio).toBe(116);
    expect(reporte.movimientos).toHaveLength(1);
    expect(reporte.movimientos[0]).toMatchObject({
      tipo: "Anticipo",
      metodoPago: "Tarjeta",
      importe: 58,
      subtotal: 100,
      iva: 16,
      total: 116,
    });
  });

  it("cobra el saldo en la fecha y método de liquidación", () => {
    const pagado = pedido({
      saldo_cobrado: true,
      saldo_metodo_pago: "Transferencia",
      saldo_cobrado_en: "2026-12-02T18:00:00.000Z",
    });

    const noviembre = construirReporteContable([pagado], NOVIEMBRE);
    expect(noviembre.totalVendido).toBe(116);
    expect(noviembre.totalCobrado).toBe(58);
    expect(noviembre.movimientos.map((m) => m.tipo)).toEqual(["Anticipo"]);

    const diciembre = construirReporteContable([pagado], DICIEMBRE);
    expect(diciembre.totalVendido).toBe(0);
    expect(diciembre.totalCobrado).toBe(58);
    expect(diciembre.movimientos[0]).toMatchObject({
      tipo: "Saldo",
      metodoPago: "Transferencia",
      fechaCobro: "2026-12-02",
    });
  });

  it("filtra por método tanto anticipo como saldo", () => {
    const pagado = pedido({
      anticipo: 50,
      total: 100,
      saldo_cobrado: true,
      saldo_metodo_pago: "Efectivo",
      saldo_cobrado_en: "2026-11-20T10:00:00.000Z",
    });

    const tarjeta = construirReporteContable([pagado], NOVIEMBRE, "Tarjeta");
    expect(tarjeta.totalCobrado).toBe(50);
    expect(tarjeta.movimientos).toHaveLength(1);
    expect(tarjeta.movimientos[0].tipo).toBe("Anticipo");

    const efectivo = construirReporteContable([pagado], NOVIEMBRE, "Efectivo");
    expect(efectivo.totalCobrado).toBe(50);
    expect(efectivo.movimientos).toHaveLength(1);
    expect(efectivo.movimientos[0].tipo).toBe("Saldo");
  });

  it("excluye pedidos cancelados", () => {
    const reporte = construirReporteContable(
      [pedido({ estado: "cancelado" })],
      NOVIEMBRE,
    );

    expect(reporte.totalVendido).toBe(0);
    expect(reporte.totalCobrado).toBe(0);
    expect(reporte.saldoPendiente).toBe(0);
    expect(reporte.movimientos).toEqual([]);
  });

  it("calcula el IVA incluido en el total", () => {
    const reporte = construirReporteContable(
      [pedido({ total: 100, anticipo: 100, subtotal: 100 })],
      NOVIEMBRE,
    );

    expect(reporte.movimientos[0].subtotal).toBe(86.21);
    expect(reporte.movimientos[0].iva).toBe(13.79);
  });

  it("agrupa ventas y cobros por día", () => {
    const reporte = construirReporteContable(
      [
        pedido({
          saldo_cobrado: true,
          saldo_metodo_pago: "Efectivo",
          saldo_cobrado_en: "2026-11-12T10:00:00.000Z",
        }),
      ],
      NOVIEMBRE,
    );

    expect(reporte.porDia).toEqual([
      {
        fecha: "2026-11-10",
        pedidos: 1,
        vendido: 116,
        cobrado: 58,
        saldoPendiente: 0,
      },
      {
        fecha: "2026-11-12",
        pedidos: 0,
        vendido: 0,
        cobrado: 58,
        saldoPendiente: 0,
      },
    ]);
  });

  it("no suma saldo pendiente cuando ya fue cobrado", () => {
    const reporte = construirReporteContable(
      [
        pedido({
          saldo_cobrado: true,
          saldo_metodo_pago: "Efectivo",
          saldo_cobrado_en: "2026-11-15T10:00:00.000Z",
        }),
      ],
      NOVIEMBRE,
    );

    expect(reporte.saldoPendiente).toBe(0);
  });

  it("resuelve vendedor y quién cobró el saldo", () => {
    const nombres = new Map([
      ["v1", "Jessica Herrera"],
      ["v2", "Carlos Ruiz"],
    ]);
    const reporte = construirReporteContable(
      [
        pedido({
          saldo_cobrado: true,
          saldo_metodo_pago: "Efectivo",
          saldo_cobrado_en: "2026-11-12T10:00:00.000Z",
          saldo_cobrado_por: "v2",
        }),
      ],
      NOVIEMBRE,
      "",
      { nombresVendedores: nombres },
    );

    expect(reporte.movimientos[0]).toMatchObject({
      tipo: "Anticipo",
      vendedorNombre: "Jessica Herrera",
      cobradoPorNombre: "Jessica Herrera",
    });
    expect(reporte.movimientos[1]).toMatchObject({
      tipo: "Saldo",
      vendedorNombre: "Jessica Herrera",
      cobradoPorNombre: "Carlos Ruiz",
    });
    expect(reporte.porVendedor).toEqual([
      {
        vendedorId: "v1",
        vendedorNombre: "Jessica Herrera",
        pedidos: 1,
        vendido: 116,
        cobrado: 116,
      },
    ]);
  });

  it("agrupa el cobro del saldo por fecha de México", () => {
    const pagado = pedido({
      saldo_cobrado: true,
      saldo_metodo_pago: "Efectivo",
      saldo_cobrado_en: "2026-11-13T01:00:00.000Z",
    });

    const reporte = construirReporteContable([pagado], {
      desde: "2026-11-12",
      hasta: "2026-11-12",
    });

    expect(reporte.totalCobrado).toBe(58);
    expect(reporte.movimientos[0]).toMatchObject({
      tipo: "Saldo",
      fechaCobro: "2026-11-12",
    });
    expect(
      reporte.porDia.find((dia) => dia.fecha === "2026-11-12")?.cobrado,
    ).toBe(58);
  });

  it("filtra por vendedor y agrupa sus ventas", () => {
    const nombres = new Map([
      ["v1", "Jessica Herrera"],
      ["v2", "Carlos Ruiz"],
    ]);
    const reporte = construirReporteContable(
      [
        pedido({ id: "p1", cajero_id: "v1" }),
        pedido({ id: "p2", cajero_id: "v2", total: 200, anticipo: 200 }),
      ],
      NOVIEMBRE,
      "",
      { vendedorId: "v1", nombresVendedores: nombres },
    );

    expect(reporte.totalPedidos).toBe(1);
    expect(reporte.totalVendido).toBe(116);
    expect(reporte.movimientos).toHaveLength(1);
    expect(reporte.porVendedor).toEqual([
      {
        vendedorId: "v1",
        vendedorNombre: "Jessica Herrera",
        pedidos: 1,
        vendido: 116,
        cobrado: 58,
      },
    ]);
  });

  it("filtra ventas sin vendedor", () => {
    const reporte = construirReporteContable(
      [
        pedido({ id: "p1", cajero_id: "v1" }),
        pedido({ id: "p2", cajero_id: null }),
      ],
      NOVIEMBRE,
      "",
      { vendedorId: "sin_vendedor" },
    );

    expect(reporte.totalPedidos).toBe(1);
    expect(reporte.porVendedor[0].vendedorNombre).toBe("Sin vendedor");
  });
});
