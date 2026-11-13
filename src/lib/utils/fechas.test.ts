import { describe, expect, it } from "vitest";
import { fechaNegocio, horaNegocio, hoyNegocio } from "./fechas";

describe("fechaNegocio", () => {
  it("convierte un timestamp UTC a la fecha de México", () => {
    expect(fechaNegocio("2026-11-13T00:59:18.145Z")).toBe("2026-11-12");
  });

  it("respeta las fechas sin hora", () => {
    expect(fechaNegocio("2026-11-13")).toBe("2026-11-13");
  });

  it("convierte un Date a la fecha de México", () => {
    expect(fechaNegocio(new Date("2026-11-13T06:30:00.000Z"))).toBe(
      "2026-11-13",
    );
  });
});

describe("horaNegocio", () => {
  it("convierte un timestamp UTC a la hora de México", () => {
    expect(horaNegocio("2026-11-13T00:59:18.145Z")).toBe("18:59:18");
  });

  it("respeta las horas sin fecha", () => {
    expect(horaNegocio("10:15")).toBe("10:15:00");
    expect(horaNegocio("10:15:30")).toBe("10:15:30");
  });
});

describe("hoyNegocio", () => {
  it("devuelve una fecha local a mediodía", () => {
    const hoy = hoyNegocio();
    expect(hoy.getHours()).toBe(12);
    expect(hoy.getDate()).toBe(Number(fechaNegocio().slice(8, 10)));
  });
});
