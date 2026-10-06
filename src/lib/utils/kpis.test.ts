import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calcularTiempoPorEtapa,
  calcularSlaPedidos,
  contarReTrabajos,
  type MovimientoKpi,
} from "./kpis";
import type { Pedido } from "@/lib/supabase/types";

function mov(
  pedido_id: string,
  to_area: string,
  created_at: string,
): MovimientoKpi {
  return { pedido_id, from_area: "x", to_area, operador_id: null, created_at };
}

describe("calcularTiempoPorEtapa", () => {
  it("promedia el tiempo entre movimientos por área destino", () => {
    const movimientos = [
      mov("p1", "diseno", "2026-01-01T10:00:00Z"),
      mov("p1", "impresion", "2026-01-01T11:00:00Z"),
      mov("p1", "laminado", "2026-01-01T13:00:00Z"),
      mov("p2", "diseno", "2026-01-02T10:00:00Z"),
      mov("p2", "impresion", "2026-01-02T12:00:00Z"),
    ];
    const result = calcularTiempoPorEtapa(movimientos);
    const diseno = result.find((r) => r.area === "diseno");
    const impresion = result.find((r) => r.area === "impresion");
    expect(diseno?.horas).toBeCloseTo(1.5, 5);
    expect(impresion?.horas).toBeCloseTo(2, 5);
    expect(result[0].area).toBe("impresion");
  });

  it("devuelve vacío sin movimientos", () => {
    expect(calcularTiempoPorEtapa([])).toEqual([]);
  });
});

describe("calcularSlaPedidos", () => {
  afterEach(() => vi.useRealTimers());

  it("calcula el porcentaje de vencidos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00"));
    const pedidos = [
      { fecha_entrega: "2026-05-01", hora_entrega: "10:00:00" },
      { fecha_entrega: "2026-12-01", hora_entrega: "10:00:00" },
    ] as Pedido[];
    const r = calcularSlaPedidos(pedidos);
    expect(r.total).toBe(2);
    expect(r.vencidos).toBe(1);
    expect(r.porcentajeVencidos).toBe(50);
  });

  it("devuelve 0 sin pedidos", () => {
    expect(calcularSlaPedidos([]).porcentajeVencidos).toBe(0);
  });
});

describe("contarReTrabajos", () => {
  it("cuenta por requiere_correccion o motivo", () => {
    const pedidos = [
      { requiere_correccion: true, motivo_correccion: null },
      { requiere_correccion: false, motivo_correccion: "Color" },
      { requiere_correccion: false, motivo_correccion: "  " },
    ] as Pedido[];
    expect(contarReTrabajos(pedidos)).toBe(2);
  });
});
