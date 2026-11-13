import { describe, expect, it } from "vitest";
import {
  construirReporteContable,
  type PedidoReporteContable,
} from "./reportesContables";
import {
  filasMovimientosContables,
  filasResumenContable,
} from "./reportesContablesCsv";

const pedido: PedidoReporteContable = {
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
  saldo_cobrado: true,
  saldo_metodo_pago: "Transferencia",
  saldo_cobrado_en: "2026-11-12T10:00:00.000Z",
  saldo_cobrado_por: "v2",
  factura_folio: "F-001",
  factura_uuid: "uuid-1",
  factura_estado: "timbrada",
};

const nombres = new Map([
  ["v1", "Jessica Herrera"],
  ["v2", "Carlos Ruiz"],
]);

const reporte = construirReporteContable(
  [pedido],
  {
    desde: "2026-11-01",
    hasta: "2026-11-30",
  },
  "",
  { nombresVendedores: nombres },
);

describe("filasResumenContable", () => {
  it("incluye metadatos, días, totales y resumen por vendedor", () => {
    const filas = filasResumenContable(reporte, {
      desde: "2026-11-01",
      hasta: "2026-11-30",
      metodoPago: "",
      vendedor: "Todos",
    });

    expect(filas[0]).toEqual(["Reporte contable"]);
    expect(filas[1]).toEqual(["Periodo", "2026-11-01 a 2026-11-30"]);
    expect(filas[2]).toEqual(["Método de pago", "Todos"]);
    expect(filas[3]).toEqual(["Vendedor", "Todos"]);
    expect(filas[5]).toEqual([
      "Fecha",
      "Pedidos",
      "Vendido",
      "Cobrado",
      "Saldo pendiente",
    ]);
    expect(filas).toContainEqual(["2026-11-10", 1, "116.00", "58.00", "0.00"]);
    expect(filas).toContainEqual([
      "Totales",
      1,
      "116.00",
      "116.00",
      "0.00",
    ]);
    expect(filas).toContainEqual([
      "Jessica Herrera",
      1,
      "116.00",
      "116.00",
    ]);
    expect(filas[filas.length - 1]).toEqual([
      "Jessica Herrera",
      1,
      "116.00",
      "116.00",
    ]);
  });
});

describe("filasMovimientosContables", () => {
  it("genera una fila por cobro con vendedor y cobrador", () => {
    const filas = filasMovimientosContables(reporte.movimientos, {
      desde: "2026-11-01",
      hasta: "2026-11-30",
      metodoPago: "Transferencia",
      vendedor: "Jessica Herrera",
    });

    expect(filas[2]).toEqual(["Método de pago", "Transferencia"]);
    expect(filas[3]).toEqual(["Vendedor", "Jessica Herrera"]);
    expect(filas[5]).toContain("Pedido");
    expect(filas).toContainEqual([
      "PIC-PAL-00001",
      "Jessica Herrera",
      "XAXX010101000",
      "Jessica Herrera",
      "Jessica Herrera",
      "2026-11-10",
      "2026-11-10",
      "Anticipo",
      "Tarjeta",
      "58.00",
      "100.00",
      "16.00",
      "116.00",
      "entregado",
      "F-001",
      "uuid-1",
      "timbrada",
    ]);
    expect(filas).toContainEqual([
      "PIC-PAL-00001",
      "Jessica Herrera",
      "XAXX010101000",
      "Jessica Herrera",
      "Carlos Ruiz",
      "2026-11-10",
      "2026-11-12",
      "Saldo",
      "Transferencia",
      "58.00",
      "100.00",
      "16.00",
      "116.00",
      "entregado",
      "F-001",
      "uuid-1",
      "timbrada",
    ]);
    expect(filas[filas.length - 1][0]).toBe("Totales");
    expect(filas[filas.length - 1][9]).toBe("116.00");
  });
});
