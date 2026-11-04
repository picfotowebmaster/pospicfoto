import { describe, expect, it } from "vitest";
import { cpValido, pedidoPagado, rfcValido } from "./fiscal";

describe("rfcValido", () => {
  it("acepta RFC de persona física y moral", () => {
    expect(rfcValido("XAXX010101000")).toBe(true);
    expect(rfcValido("ABC010101AB1")).toBe(true);
  });

  it("rechaza RFC incompletos", () => {
    expect(rfcValido("")).toBe(false);
    expect(rfcValido("ABC123")).toBe(false);
  });
});

describe("cpValido", () => {
  it("acepta cinco dígitos", () => {
    expect(cpValido("06450")).toBe(true);
  });

  it("rechaza longitudes distintas", () => {
    expect(cpValido("6450")).toBe(false);
    expect(cpValido("064500")).toBe(false);
  });
});

describe("pedidoPagado", () => {
  it("considera pagado cuando el saldo fue cobrado", () => {
    expect(pedidoPagado({ total: 100, anticipo: 70, saldo_cobrado: true })).toBe(true);
  });

  it("considera pagado cuando el anticipo cubre el total", () => {
    expect(pedidoPagado({ total: 100, anticipo: 100 })).toBe(true);
  });

  it("considera pendiente cuando queda saldo", () => {
    expect(pedidoPagado({ total: 100, anticipo: 70 })).toBe(false);
  });
});
