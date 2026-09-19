import { describe, it, expect } from "vitest";
import { sumarLineas, calcularAnticipo, generarIdLocal } from "./calculos";

describe("sumarLineas", () => {
  it("retorna 0 para array vacio", () => {
    expect(sumarLineas([])).toBe(0);
  });

  it("suma cantidad * precio_unitario de cada linea", () => {
    const lineas = [
      { cantidad: 2, precio_unitario: 100 },
      { cantidad: 3, precio_unitario: 50 },
    ];
    expect(sumarLineas(lineas)).toBe(350);
  });

  it("maneja una sola linea", () => {
    expect(sumarLineas([{ cantidad: 1, precio_unitario: 99.99 }])).toBe(99.99);
  });

  it("maneja precios con decimales", () => {
    const lineas = [
      { cantidad: 2, precio_unitario: 49.99 },
      { cantidad: 1, precio_unitario: 25.5 },
    ];
    expect(sumarLineas(lineas)).toBeCloseTo(125.48, 2);
  });

  it("maneja cantidad cero", () => {
    const lineas = [{ cantidad: 0, precio_unitario: 100 }];
    expect(sumarLineas(lineas)).toBe(0);
  });
});

describe("calcularAnticipo", () => {
  it("calcula 0% de anticipo", () => {
    expect(calcularAnticipo(1000, 0)).toBe(0);
  });

  it("calcula 70% de anticipo", () => {
    expect(calcularAnticipo(1000, 70)).toBe(700);
  });

  it("calcula 100% de anticipo", () => {
    expect(calcularAnticipo(1000, 100)).toBe(1000);
  });

  it("redondea a 2 decimales", () => {
    expect(calcularAnticipo(333.33, 70)).toBe(233.33);
  });

  it("maneja subtotal cero", () => {
    expect(calcularAnticipo(0, 50)).toBe(0);
  });

  it("maneja porcentajes con decimales", () => {
    const result = calcularAnticipo(1000, 33.33);
    expect(result).toBe(333.3);
  });
});

describe("generarIdLocal", () => {
  it("retorna un string", () => {
    expect(typeof generarIdLocal()).toBe("string");
  });

  it("retorna un UUID-like string", () => {
    const id = generarIdLocal();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(id)).toBe(true);
  });
});
