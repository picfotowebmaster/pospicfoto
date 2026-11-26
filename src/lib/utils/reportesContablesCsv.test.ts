import { describe, expect, it } from "vitest";
import {
  construirReporteContable,
  type MovimientoContable,
  type PedidoReporteContable,
} from "./reportesContables";
import {
  filasGastosCaja,
  filasMovimientosContables,
  filasResumenContable,
} from "./reportesContablesCsv";
import type { GastoCaja } from "@/lib/supabase/types";

const pedido: PedidoReporteContable = {
  id: "p1",
  numero_pedido: "PIC-PAL-00001",
  cliente_nombre: "Jessica Herrera",
  cliente_rfc: "XAXX010101000",
  cajero_id: "v1",
  sucursal_id: "suc-1",
  marca_id: "mar-1",
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
  {
    nombresVendedores: nombres,
    nombresSucursales: new Map([["suc-1", "Palma"]]),
    nombresMarcas: new Map([["mar-1", "Picfoto"]]),
  },
);

const meta = {
  desde: "2026-11-01",
  hasta: "2026-11-30",
  metodoPago: "",
  vendedor: "Todos",
  sucursal: "Palma",
  marca: "Picfoto",
  generadoEn: "20/11/2026, 10:30",
  generadoPor: "Jessica Herrera",
};

describe("filasResumenContable", () => {
  it("incluye metadatos, días, totales y desgloses", () => {
    const filas = filasResumenContable(reporte, meta);

    expect(filas[0]).toEqual(["Reporte contable de corte"]);
    expect(filas[1]).toEqual(["Sucursal", "Palma"]);
    expect(filas[2]).toEqual(["Marca", "Picfoto"]);
    expect(filas[3]).toEqual(["Periodo", "2026-11-01 a 2026-11-30"]);
    expect(filas[4]).toEqual(["Método de pago", "Todos"]);
    expect(filas[5]).toEqual(["Vendedor", "Todos"]);
    expect(filas[6]).toEqual(["Generado", "20/11/2026, 10:30"]);
    expect(filas[7]).toEqual(["Generado por", "Jessica Herrera"]);
    expect(filas[9]).toEqual([
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
    expect(filas).toContainEqual(["Cobrado bruto", "116.00"]);
    expect(filas).toContainEqual(["Reembolsos realizados", "0.00"]);
    expect(filas).toContainEqual(["Cobrado neto", "116.00"]);
    expect(filas).toContainEqual([
      "Jessica Herrera",
      1,
      "116.00",
      "116.00",
    ]);
    expect(filas).toContainEqual([
      "Totales",
      1,
      "116.00",
      "116.00",
    ]);
    expect(filas).toContainEqual(["Cobrado por cobrador"]);
    expect(filas).toContainEqual(["Carlos Ruiz", 1, "58.00"]);
    expect(filas).toContainEqual(["Cobrado por método"]);
    expect(filas).toContainEqual(["Tarjeta", 1, "58.00"]);
    expect(filas).toContainEqual(["Transferencia", 1, "58.00"]);
  });
});

describe("filasResumenContable con gastos de caja", () => {
  const gastos: GastoCaja[] = [
    {
      id: "g1",
      sucursal_id: "suc-1",
      concepto: "Compra de tinta",
      categoria: "Insumos",
      monto: 30,
      fecha: "2026-11-10",
      registrado_por: "v1",
      registrado_por_nombre: "Jessica Herrera",
      created_at: "2026-11-10T15:00:00.000Z",
      anulado: false,
    },
    {
      id: "g2",
      sucursal_id: "suc-1",
      concepto: "Limpieza",
      categoria: null,
      monto: 20,
      fecha: "2026-11-11",
      registrado_por: "v1",
      registrado_por_nombre: "Jessica Herrera",
      created_at: "2026-11-11T15:00:00.000Z",
      anulado: false,
    },
    {
      id: "g3",
      sucursal_id: "suc-1",
      concepto: "Gasto anulado",
      categoria: null,
      monto: 99,
      fecha: "2026-11-12",
      registrado_por: "v1",
      registrado_por_nombre: "Jessica Herrera",
      created_at: "2026-11-12T15:00:00.000Z",
      anulado: true,
    },
  ];

  it("agrega resumen de efectivo y detalle solo de gastos activos", () => {
    const filas = filasResumenContable(reporte, meta, gastos, 250);

    expect(filas).toContainEqual(["Efectivo cobrado", "250.00"]);
    expect(filas).toContainEqual(["Gastos de caja", "50.00"]);
    expect(filas).toContainEqual(["Efectivo en caja", "200.00"]);
    expect(filas).toContainEqual(["Gastos de caja del periodo"]);
    expect(filas).toContainEqual([
      "2026-11-10",
      "Compra de tinta",
      "Insumos",
      "30.00",
      "Jessica Herrera",
    ]);
    expect(filas).not.toContainEqual([
      "2026-11-12",
      "Gasto anulado",
      "",
      "99.00",
      "Jessica Herrera",
    ]);
    expect(filas).toContainEqual(["Totales", "", "", "50.00", ""]);
  });

  it("genera el CSV dedicado de gastos con estado y total activo", () => {
    const filas = filasGastosCaja(gastos, meta);

    expect(filas[0]).toEqual(["Reporte contable de corte"]);
    expect(filas).toContainEqual([
      "Fecha",
      "Concepto",
      "Categoría",
      "Monto",
      "Estado",
      "Registrado por",
    ]);
    expect(filas).toContainEqual([
      "2026-11-12",
      "Gasto anulado",
      "",
      "99.00",
      "Anulado",
      "Jessica Herrera",
    ]);
    expect(filas[filas.length - 1]).toEqual([
      "Totales",
      "",
      "",
      "50.00",
      "",
      "",
    ]);
  });

  it("omite efectivo y gastos cuando el filtro no es Efectivo", () => {
    const filas = filasResumenContable(
      reporte,
      { ...meta, metodoPago: "Tarjeta" },
      gastos,
      250,
    );

    expect(filas).not.toContainEqual(["Efectivo cobrado", "250.00"]);
    expect(filas).not.toContainEqual(["Gastos de caja", "50.00"]);
    expect(filas).not.toContainEqual(["Efectivo en caja", "200.00"]);
    expect(filas).not.toContainEqual(["Gastos de caja del periodo"]);
  });
});

describe("filasMovimientosContables", () => {
  it("genera una fila por cobro con sucursal, marca, vendedor y cobrador", () => {
    const filas = filasMovimientosContables(reporte.movimientos, {
      ...meta,
      metodoPago: "Transferencia",
      vendedor: "Jessica Herrera",
    });

    expect(filas[1]).toEqual(["Sucursal", "Palma"]);
    expect(filas[2]).toEqual(["Marca", "Picfoto"]);
    expect(filas[4]).toEqual(["Método de pago", "Transferencia"]);
    expect(filas[5]).toEqual(["Vendedor", "Jessica Herrera"]);
    expect(filas[9]).toContain("Pedido");
    expect(filas[9]).toContain("Sucursal");
    expect(filas[9]).toContain("Marca");
    expect(filas).toContainEqual([
      "PIC-PAL-00001",
      "Palma",
      "Picfoto",
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
      "Palma",
      "Picfoto",
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
    expect(filas[filas.length - 1][11]).toBe("116.00");
  });

  it("muestra reembolsos con importe negativo", () => {
    const movimientos: MovimientoContable[] = [
      {
        pedidoId: "p1",
        numeroPedido: "PIC-PAL-00001",
        clienteNombre: "Jessica Herrera",
        clienteRfc: "XAXX010101000",
        sucursalId: "suc-1",
        sucursalNombre: "Palma",
        marcaId: "mar-1",
        marcaNombre: "Picfoto",
        vendedorId: "v1",
        vendedorNombre: "Jessica Herrera",
        cobradoPorId: "v1",
        cobradoPorNombre: "Jessica Herrera",
        fechaVenta: "2026-11-10",
        fechaCobro: "2026-11-20",
        tipo: "Reembolso",
        metodoPago: "Reembolso",
        importe: -58,
        subtotal: -50,
        iva: -8,
        total: 116,
        estado: "cancelado",
        facturaFolio: null,
        facturaUuid: null,
        facturaEstado: null,
      },
    ];

    const filas = filasMovimientosContables(movimientos, meta);
    expect(filas).toContainEqual(
      expect.arrayContaining(["Reembolso", "Reembolso", "-58.00"]),
    );
    expect(filas[filas.length - 1][11]).toBe("-58.00");
  });
});
