import { describe, expect, it } from "vitest";
import {
  calcularPeriodo,
  construirLineasGlobal,
  contarPedidosGlobal,
  filtrarPedidosGlobal,
  pedidoAptoParaGlobal,
  totalPedido,
} from "./facturacionGlobal";
import type { Pedido } from "../supabase/types";

function pedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: "pedido-1",
    cajero_id: null,
    cliente_nombre: "Cliente",
    cliente_telefono: null,
    fecha_recepcion: "2026-11-05",
    hora_recepcion: "10:00",
    fecha_entrega: "2026-11-06",
    hora_entrega: "10:00",
    requiere_correccion: false,
    estado: "entregado",
    area_actual: "mostrador",
    ruta: "R1",
    area_destino: null,
    subtotal: 100,
    anticipo: 100,
    total: 100,
    metodo_pago: "Efectivo",
    created_at: "2026-11-05T16:00:00.000Z",
    updated_at: "2026-11-05T16:00:00.000Z",
    ...overrides,
  };
}

function conDetalles(importes: number[], overrides: Partial<Pedido> = {}): Pedido {
  return pedido({
    detalle_pedidos: importes.map((importe, i) => ({
      id: `det-${i}`,
      pedido_id: overrides.id ?? "pedido-1",
      producto_nombre: `Producto ${i}`,
      cantidad: 1,
      precio_unitario: importe,
      importe_linea: importe,
      atributos: {},
    })),
    ...overrides,
  });
}

describe("calcularPeriodo", () => {
  it("calcula el rango del mes", () => {
    const periodo = calcularPeriodo("2026-11");
    expect(periodo).not.toBeNull();
    expect(periodo?.desde).toBe("2026-11-01");
    expect(periodo?.hasta).toBe("2026-12-01");
    expect(periodo?.desdeISO).toBe("2026-11-01T00:00:00-06:00");
    expect(periodo?.mes).toBe(11);
    expect(periodo?.anio).toBe(2026);
  });

  it("hace el salto de diciembre a enero", () => {
    const periodo = calcularPeriodo("2026-12");
    expect(periodo?.hasta).toBe("2027-01-01");
  });

  it("rechaza periodos inválidos", () => {
    expect(calcularPeriodo("2026-13")).toBeNull();
    expect(calcularPeriodo("2026-1")).toBeNull();
    expect(calcularPeriodo("noviembre")).toBeNull();
  });
});

describe("pedidoAptoParaGlobal", () => {
  it("acepta un pedido pagado, sin RFC y sin factura", () => {
    expect(pedidoAptoParaGlobal(pedido())).toBe(true);
  });

  it("rechaza pedidos con RFC", () => {
    expect(
      pedidoAptoParaGlobal(pedido({ cliente_rfc: "ABC010101AB1" })),
    ).toBe(false);
  });

  it("rechaza pedidos sin pago total", () => {
    expect(
      pedidoAptoParaGlobal(pedido({ anticipo: 70, saldo_cobrado: false })),
    ).toBe(false);
  });

  it("rechaza pedidos ya facturados o incluidos en global", () => {
    expect(
      pedidoAptoParaGlobal(pedido({ factura_uuid: "uuid-1" })),
    ).toBe(false);
    expect(
      pedidoAptoParaGlobal(pedido({ factura_global_id: "global-1" })),
    ).toBe(false);
  });

  it("rechaza pedidos cancelados", () => {
    expect(pedidoAptoParaGlobal(pedido({ estado: "cancelado" }))).toBe(false);
  });
});

describe("filtrarPedidosGlobal", () => {
  const periodo = calcularPeriodo("2026-11")!;

  it("incluye solo pagos dentro del periodo", () => {
    const dentro = pedido({
      id: "dentro",
      fecha_pago_total: "2026-11-15T18:00:00.000Z",
    });
    const fuera = pedido({
      id: "fuera",
      fecha_pago_total: "2026-12-01T18:00:00.000Z",
    });

    expect(filtrarPedidosGlobal([dentro, fuera], periodo)).toEqual([dentro]);
  });

  it("excluye pedidos sin fecha de pago", () => {
    expect(filtrarPedidosGlobal([pedido()], periodo)).toEqual([]);
  });
});

describe("totales de la factura global", () => {
  it("suma los importes de los pedidos", () => {
    const pedidos = [
      conDetalles([100, 50], { id: "p1" }),
      conDetalles([25.5], { id: "p2" }),
    ];

    expect(totalPedido(pedidos[0])).toBe(150);
    expect(construirLineasGlobal(pedidos)).toEqual([
      {
        producto_nombre: "Venta de productos y servicios (factura global)",
        cantidad: 1,
        precio_unitario: 175.5,
      },
    ]);
  });

  it("cuenta tickets distintos", () => {
    const pedidos = [
      pedido({ id: "p1", factura_numero: "PIC-1" }),
      pedido({ id: "p2", factura_numero: "PIC-1" }),
      pedido({ id: "p3", factura_numero: "PIC-2" }),
    ];

    expect(contarPedidosGlobal(pedidos)).toBe(2);
  });
});
