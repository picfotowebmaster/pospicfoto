import { describe, it, expect } from "vitest";
import type { PagoDraft } from "@/lib/supabase/types";
import {
  escalarPagos,
  normalizarPagos,
  pagosEsMixto,
  repartirPagosProporcional,
  resumenMetodoPago,
  resumenTextoPagos,
  sumarPagos,
  validarPagos,
} from "./pagos";

describe("sumarPagos", () => {
  it("suma y redondea a dos decimales", () => {
    expect(
      sumarPagos([
        { metodo: "Efectivo", monto: 10.005 },
        { metodo: "Tarjeta", monto: 5.1 },
      ]),
    ).toBe(15.11);
  });

  it("ignora montos no positivos al normalizar", () => {
    expect(
      normalizarPagos([
        { metodo: "Efectivo", monto: 0 },
        { metodo: "Tarjeta", monto: -5 },
      ]),
    ).toEqual([]);
  });
});

describe("validarPagos", () => {
  it("acepta cuando la suma coincide con el total", () => {
    const resultado = validarPagos(
      [
        { metodo: "Efectivo", monto: 300 },
        { metodo: "Tarjeta", monto: 200 },
      ],
      500,
    );
    expect(resultado.valido).toBe(true);
    expect(resultado.diferencia).toBe(0);
  });

  it("rechaza cuando falta dinero", () => {
    const resultado = validarPagos([{ metodo: "Efectivo", monto: 300 }], 500);
    expect(resultado.valido).toBe(false);
    expect(resultado.diferencia).toBe(200);
  });

  it("rechaza cuando no hay pagos", () => {
    expect(validarPagos([], 100).valido).toBe(false);
  });

  it("tolera un centavo de diferencia", () => {
    expect(validarPagos([{ metodo: "Efectivo", monto: 99.99 }], 100).valido).toBe(
      true,
    );
  });
});

describe("resumenMetodoPago", () => {
  it("devuelve el método con mayor monto", () => {
    expect(
      resumenMetodoPago([
        { metodo: "Efectivo", monto: 100 },
        { metodo: "Tarjeta", monto: 250 },
      ]),
    ).toBe("Tarjeta");
  });

  it("devuelve el valor por defecto sin pagos", () => {
    expect(resumenMetodoPago([], "Transferencia")).toBe("Transferencia");
  });

  it("detecta pagos mixtos y los describe", () => {
    const pagos: PagoDraft[] = [
      { metodo: "Efectivo", monto: 100 },
      { metodo: "Tarjeta", monto: 100 },
    ];
    expect(pagosEsMixto(pagos)).toBe(true);
    expect(resumenTextoPagos(pagos)).toBe("Efectivo + Tarjeta");
  });

  it("describe un solo método sin prefijo", () => {
    expect(
      resumenTextoPagos([{ metodo: "Depósito", monto: 500 }]),
    ).toBe("Depósito");
  });
});

describe("escalarPagos", () => {
  it("escala proporcionalmente y ajusta el residuo", () => {
    const resultado = escalarPagos(
      [
        { metodo: "Efectivo", monto: 100 },
        { metodo: "Tarjeta", monto: 50 },
      ],
      300,
    );
    expect(sumarPagos(resultado)).toBe(300);
    expect(resultado[0].monto).toBe(200);
    expect(resultado[1].monto).toBe(100);
  });

  it("devuelve vacío si el total es cero", () => {
    expect(escalarPagos([{ metodo: "Efectivo", monto: 100 }], 0)).toEqual([]);
  });
});

describe("repartirPagosProporcional", () => {
  it("reparte cada método entre los subpedidos sin perder centavos", () => {
    const pagos: PagoDraft[] = [
      { metodo: "Efectivo", monto: 100 },
      { metodo: "Tarjeta", monto: 50 },
    ];
    const grupos = repartirPagosProporcional(pagos, [0.5, 0.5]);

    expect(grupos).toHaveLength(2);
    expect(sumarPagos(grupos[0]) + sumarPagos(grupos[1])).toBe(150);
    expect(grupos[0].find((p) => p.metodo === "Efectivo")?.monto).toBe(50);
    expect(grupos[1].find((p) => p.metodo === "Efectivo")?.monto).toBe(50);
  });

  it("asigna todo a un solo grupo cuando el factor es 1", () => {
    const pagos: PagoDraft[] = [{ metodo: "Efectivo", monto: 99.99 }];
    const grupos = repartirPagosProporcional(pagos, [1]);
    expect(grupos[0]).toEqual([{ metodo: "Efectivo", monto: 99.99 }]);
  });
});
