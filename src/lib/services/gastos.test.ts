import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase/client";
import {
  anularGastoCaja,
  crearGastoCaja,
  listarGastosCaja,
} from "./gastos";

interface QbResult {
  data: unknown;
  error: unknown;
}

type MockBuilder = Record<string, ReturnType<typeof vi.fn>> & {
  then: (onFulfilled: (valor: QbResult) => unknown) => Promise<unknown>;
};

function builder(result: QbResult): MockBuilder {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  for (const metodo of [
    "select",
    "eq",
    "gte",
    "lte",
    "order",
    "insert",
    "update",
  ]) {
    b[metodo] = vi.fn(chain);
  }
  b.then = (onFulfilled: (valor: QbResult) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as MockBuilder;
}

const rango = { desde: "2026-11-01", hasta: "2026-11-30" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listarGastosCaja", () => {
  it("filtra por sucursal y rango, y normaliza monto y nombre", async () => {
    const consulta = builder({
      data: [
        {
          id: "g1",
          sucursal_id: "s1",
          concepto: "Compra de tinta",
          categoria: "Insumos",
          monto: "30.00",
          fecha: "2026-11-10",
          registrado_por: "u1",
          created_at: "2026-11-10T15:00:00.000Z",
          anulado: false,
          anulado_por: null,
          anulado_en: null,
          registrado: { nombre: "Jessica Herrera" },
        },
      ],
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue(consulta as never);

    const gastos = await listarGastosCaja(rango, "s1");

    expect(supabase.from).toHaveBeenCalledWith("gastos_caja");
    expect(consulta.eq).toHaveBeenCalledWith("sucursal_id", "s1");
    expect(consulta.gte).toHaveBeenCalledWith("fecha", rango.desde);
    expect(consulta.lte).toHaveBeenCalledWith("fecha", rango.hasta);
    expect(gastos).toHaveLength(1);
    expect(gastos[0].monto).toBe(30);
    expect(gastos[0].registrado_por_nombre).toBe("Jessica Herrera");
  });
});

describe("crearGastoCaja", () => {
  it("inserta el gasto con el concepto limpio", async () => {
    const consulta = builder({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(consulta as never);

    await crearGastoCaja({
      sucursal_id: "s1",
      concepto: "  Compra de tinta  ",
      categoria: "Insumos",
      monto: 30,
      fecha: "2026-11-10",
    });

    expect(supabase.from).toHaveBeenCalledWith("gastos_caja");
    expect(consulta.insert).toHaveBeenCalledWith({
      sucursal_id: "s1",
      concepto: "Compra de tinta",
      categoria: "Insumos",
      monto: 30,
      fecha: "2026-11-10",
    });
  });
});

describe("anularGastoCaja", () => {
  it("anula el gasto vía RPC segura", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

    await anularGastoCaja("g1");

    expect(supabase.rpc).toHaveBeenCalledWith("anular_gasto_caja", {
      p_id: "g1",
    });
  });
});
