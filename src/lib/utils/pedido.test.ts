import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getSlaLevel,
  getAgingLevel,
  formatRelativeDue,
  getRutaLabel,
  formatAttrs,
  elapsedFromTime,
  redondearA30Min,
} from "./pedido";

describe("getSlaLevel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve danger si la fecha ya venció", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00"));
    expect(getSlaLevel("2026-06-01", "10:00:00")).toBe("danger");
  });

  it("devuelve warning si vence en menos de 24h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00"));
    expect(getSlaLevel("2026-06-02", "08:00:00")).toBe("warning");
  });

  it("devuelve ok si vence en más de 24h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00"));
    expect(getSlaLevel("2026-06-05", "12:00:00")).toBe("ok");
  });
});

describe("getAgingLevel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("clasifica por antigüedad en columna", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00"));

    expect(getAgingLevel("2026-06-01T11:00:00")).toBe("ok");
    expect(getAgingLevel("2026-05-31T11:00:00")).toBe("warning");
    expect(getAgingLevel("2026-05-28T11:00:00")).toBe("danger");
  });
});

describe("formatRelativeDue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("describe tiempo restante y vencido", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00"));

    expect(formatRelativeDue("2026-06-01", "14:30:00")).toBe("vence en 2 h");
    expect(formatRelativeDue("2026-06-01", "11:30:00")).toBe("venció hace 30 min");
    expect(formatRelativeDue("2026-06-03", "12:00:00")).toBe("vence en 2 d");
  });
});

describe("getRutaLabel", () => {
  it("traduce las rutas conocidas", () => {
    expect(getRutaLabel("R1")).toBe("Impresión");
    expect(getRutaLabel("R4")).toBe("Laminado");
  });

  it("devuelve cadena vacía sin ruta y el valor original si es desconocida", () => {
    expect(getRutaLabel(null)).toBe("");
    expect(getRutaLabel("RX")).toBe("RX");
  });
});

describe("formatAttrs", () => {
  it("une los atributos con separador", () => {
    expect(formatAttrs({ tamaño: "10x15", acabado: "mate" })).toBe(
      "tamaño: 10x15 · acabado: mate",
    );
  });
});

describe("redondearA30Min", () => {
  it("devuelve vacío si no hay hora", () => {
    expect(redondearA30Min("")).toBe("");
  });

  it("mantiene valores ya en :00 o :30", () => {
    expect(redondearA30Min("09:00")).toBe("09:00");
    expect(redondearA30Min("14:30")).toBe("14:30");
  });

  it("redondea al intervalo de 30 min más cercano", () => {
    expect(redondearA30Min("09:07")).toBe("09:00");
    expect(redondearA30Min("09:22")).toBe("09:30");
    expect(redondearA30Min("09:45")).toBe("10:00");
  });

  it("hace acarreo de hora y wrap a medianoche", () => {
    expect(redondearA30Min("23:45")).toBe("00:00");
    expect(redondearA30Min("10:59")).toBe("11:00");
  });
});

describe("elapsedFromTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve minutos, horas y días", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00"));

    expect(elapsedFromTime("2026-06-01T11:30:00")).toBe("30 min");
    expect(elapsedFromTime("2026-06-01T08:00:00")).toBe("4 h");
    expect(elapsedFromTime("2026-05-30T12:00:00")).toBe("2 d");
  });
});
