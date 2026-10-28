import { describe, expect, it } from "vitest";
import type { Descuento } from "@/lib/supabase/types";
import {
  calcularMonto,
  esTablaDescuentosFaltante,
  estaVigente,
  fechaHoyMexico,
  resolverDescuento,
} from "./descuentos";

function descuento(overrides: Partial<Descuento> = {}): Descuento {
  return {
    id: crypto.randomUUID(),
    nombre: "Promo",
    tipo: "porcentaje",
    valor: 10,
    alcance: "producto",
    producto_id: "prod-1",
    categoria_id: null,
    fecha_inicio: "2026-07-01",
    fecha_fin: "2026-07-31",
    activo: true,
    created_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

const producto = { id: "prod-1", categoria_id: "cat-1" };

describe("resolverDescuento", () => {
  it("aplica porcentaje al precio base", () => {
    const resultado = resolverDescuento(
      producto,
      100,
      [descuento({ valor: 10 })],
      "2026-07-15",
    );

    expect(resultado).toMatchObject({
      descuento_monto: 10,
      precio_final: 90,
      descuento_tipo: "porcentaje",
    });
  });

  it("aplica monto fijo", () => {
    const resultado = resolverDescuento(
      producto,
      100,
      [descuento({ tipo: "monto_fijo", valor: 30 })],
      "2026-07-15",
    );

    expect(resultado?.descuento_monto).toBe(30);
    expect(resultado?.precio_final).toBe(70);
  });

  it("el descuento de producto gana al de categoría", () => {
    const resultado = resolverDescuento(
      producto,
      100,
      [
        descuento({ id: "prod", valor: 10 }),
        descuento({
          id: "cat",
          alcance: "categoria",
          producto_id: null,
          categoria_id: "cat-1",
          valor: 20,
        }),
      ],
      "2026-07-15",
    );

    expect(resultado?.descuento_id).toBe("prod");
    expect(resultado?.precio_final).toBe(90);
  });

  it("usa categoría si no hay descuento de producto", () => {
    const resultado = resolverDescuento(
      producto,
      100,
      [
        descuento({
          alcance: "categoria",
          producto_id: null,
          categoria_id: "cat-1",
          valor: 20,
        }),
      ],
      "2026-07-15",
    );

    expect(resultado?.descuento_monto).toBe(20);
    expect(resultado?.precio_final).toBe(80);
  });

  it("elige el mejor descuento dentro del mismo alcance", () => {
    const resultado = resolverDescuento(
      producto,
      100,
      [
        descuento({ id: "a", valor: 10 }),
        descuento({ id: "b", valor: 15 }),
      ],
      "2026-07-15",
    );

    expect(resultado?.descuento_id).toBe("b");
    expect(resultado?.descuento_monto).toBe(15);
  });

  it("respeta fechas inclusivas y descarta fuera de rango", () => {
    const d = descuento();
    expect(estaVigente(d, "2026-07-01")).toBe(true);
    expect(estaVigente(d, "2026-07-31")).toBe(true);
    expect(estaVigente(d, "2026-06-30")).toBe(false);
    expect(estaVigente(d, "2026-08-01")).toBe(false);
  });

  it("ignora descuentos inactivos", () => {
    expect(
      resolverDescuento(
        producto,
        100,
        [descuento({ activo: false })],
        "2026-07-15",
      ),
    ).toBeNull();
  });

  it("no deja el precio en cero", () => {
    const resultado = resolverDescuento(
      producto,
      100,
      [descuento({ tipo: "monto_fijo", valor: 200 })],
      "2026-07-15",
    );

    expect(resultado?.descuento_monto).toBe(99.99);
    expect(resultado?.precio_final).toBe(0.01);
  });

  it("topa porcentajes del 100%", () => {
    const resultado = resolverDescuento(
      producto,
      100,
      [descuento({ valor: 100 })],
      "2026-07-15",
    );

    expect(resultado?.precio_final).toBe(0.01);
  });

  it("no aplica a precios cero o inválidos", () => {
    expect(resolverDescuento(producto, 0, [descuento()])).toBeNull();
    expect(resolverDescuento(producto, -5, [descuento()])).toBeNull();
  });
});

describe("calcularMonto", () => {
  it("redondea a dos decimales", () => {
    expect(
      calcularMonto(99.99, descuento({ valor: 12.5 })),
    ).toBe(12.5);
  });
});

describe("utilidades de fechas y migración", () => {
  it("calcula la fecha de México", () => {
    expect(
      fechaHoyMexico(new Date("2026-07-15T12:00:00Z")),
    ).toBe("2026-07-15");
  });

  it("detecta la tabla de descuentos faltante", () => {
    expect(
      esTablaDescuentosFaltante({
        code: "PGRST205",
        message: "Could not find the table 'public.descuentos'",
      }),
    ).toBe(true);
    expect(esTablaDescuentosFaltante(new Error("otro"))).toBe(false);
  });
});
