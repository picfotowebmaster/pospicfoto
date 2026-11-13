import { describe, expect, it } from "vitest";
import { calcularRangoPeriodo } from "./periodos";

const jueves = new Date(2026, 10, 12);

describe("calcularRangoPeriodo", () => {
  it("calcula el día actual", () => {
    expect(calcularRangoPeriodo("hoy", { hoy: jueves })).toEqual({
      desde: "2026-11-12",
      hasta: "2026-11-12",
    });
  });

  it("calcula la semana de lunes a domingo", () => {
    expect(calcularRangoPeriodo("semana", { hoy: jueves })).toEqual({
      desde: "2026-11-09",
      hasta: "2026-11-15",
    });
  });

  it("considera el domingo como fin de semana", () => {
    expect(
      calcularRangoPeriodo("semana", { hoy: new Date(2026, 10, 15) }),
    ).toEqual({
      desde: "2026-11-09",
      hasta: "2026-11-15",
    });
  });

  it("cruza correctamente el cambio de mes", () => {
    expect(
      calcularRangoPeriodo("semana", { hoy: new Date(2026, 11, 1) }),
    ).toEqual({
      desde: "2026-11-30",
      hasta: "2026-12-06",
    });
  });

  it("calcula el mes completo", () => {
    expect(calcularRangoPeriodo("mes", { hoy: jueves })).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });
  });

  it("calcula el año completo", () => {
    expect(calcularRangoPeriodo("anio", { hoy: jueves })).toEqual({
      desde: "2026-01-01",
      hasta: "2026-12-31",
    });
  });

  it("usa las fechas personalizadas cuando existen", () => {
    expect(
      calcularRangoPeriodo("personalizado", {
        hoy: jueves,
        desde: "2026-10-01",
        hasta: "2026-10-15",
      }),
    ).toEqual({ desde: "2026-10-01", hasta: "2026-10-15" });
  });

  it("usa el día actual como respaldo en personalizado", () => {
    expect(calcularRangoPeriodo("personalizado", { hoy: jueves })).toEqual({
      desde: "2026-11-12",
      hasta: "2026-11-12",
    });
  });
});
