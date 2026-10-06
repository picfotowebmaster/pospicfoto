import { describe, it, expect } from "vitest";
import { filasACsv } from "./csv";

describe("filasACsv", () => {
  it("envuelve celdas en comillas y separa por coma", () => {
    const csv = filasACsv([
      ["Nombre", "Total"],
      ["Juan", 100],
    ]);
    expect(csv).toBe('"Nombre","Total"\n"Juan","100"');
  });

  it("escapa comillas dobles", () => {
    const csv = filasACsv([['Cliente "VIP"']]);
    expect(csv).toBe('"Cliente ""VIP"""');
  });

  it("convierte null y undefined en vacío", () => {
    const csv = filasACsv([[null, undefined, "ok"]]);
    expect(csv).toBe('"","","ok"');
  });
});
