import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/lib/supabase/client";
import {
  fetchProductionAreas, fetchWorkflowRoutes, getNextAreas,
  advancePedido, fetchPedidosByArea, fetchUserRole, regresarPedido,
} from "./workflow";

function qb(terminalMethod: string | null = null, data: unknown = null, error: Error | null = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "gt", "gte", "lt", "lte", "ilike", "in", "order", "limit", "range", "single", "maybeSingle"];
  for (const m of methods) {
    builder[m] = terminalMethod === m
      ? vi.fn().mockResolvedValue(error ? { data, error } : { data, error: null })
      : vi.fn().mockReturnThis();
  }
  return builder;
}

function qbDoubleEq(data: unknown[], error: Error | null = null) {
  let eqCalls = 0;
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "insert", "update", "delete", "neq", "gt", "gte", "lt", "lte", "ilike", "in", "order", "limit", "range", "single", "maybeSingle"]) {
    builder[m] = vi.fn().mockReturnThis();
  }
  builder.eq = vi.fn().mockImplementation(() => {
    eqCalls++;
    if (eqCalls >= 2) {
      return Promise.resolve(error ? { data, error } : { data, error: null });
    }
    return builder;
  });
  return builder;
}

describe("fetchProductionAreas", () => {
  it("retorna areas", async () => {
    const mock = [{ id: "a1", nombre: "Mostrador", color: "yellow", orden: 0 }];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mock, error: null }),
    } as ReturnType<typeof supabase.from>);
    expect(await fetchProductionAreas()).toEqual(mock);
  });

  it("lanza error", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error("fail") }),
    } as ReturnType<typeof supabase.from>);
    await expect(fetchProductionAreas()).rejects.toThrow("fail");
  });
});

describe("fetchWorkflowRoutes", () => {
  it("retorna rutas", async () => {
    const mock = [{ id: "r1", from_area: "mostrador", to_area: "diseno", ruta: "R1", multiple: false }];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mock, error: null }),
    } as ReturnType<typeof supabase.from>);
    expect(await fetchWorkflowRoutes()).toEqual(mock);
  });
});

describe("getNextAreas", () => {
  it("retorna destinos", async () => {
    vi.mocked(supabase.from).mockReturnValue(qbDoubleEq([
      { id: "r", from_area: "diseno", to_area: "impresion", ruta: "R1", multiple: false },
    ]) as ReturnType<typeof supabase.from>);
    const result = await getNextAreas("diseno", "R1");
    expect(result).toEqual([{ destination: "impresion", multiple: false }]);
  });

  it("retorna vacio sin rutas", async () => {
    vi.mocked(supabase.from).mockReturnValue(qbDoubleEq([]) as ReturnType<typeof supabase.from>);
    expect(await getNextAreas("mostrador", "R99")).toEqual([]);
  });

  it("retorna multiple: true", async () => {
    vi.mocked(supabase.from).mockReturnValue(qbDoubleEq([
      { id: "r1", from_area: "impresion", to_area: "laminado", ruta: "R1", multiple: true },
      { id: "r2", from_area: "impresion", to_area: "montaje", ruta: "R1", multiple: true },
    ]) as ReturnType<typeof supabase.from>);
    const result = await getNextAreas("impresion", "R1");
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.multiple)).toBe(true);
  });
});

describe("advancePedido", () => {
  beforeEach(() => vi.clearAllMocks());

  it("avanza a siguiente area", async () => {
    let fromCalls = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      fromCalls++;
      if (fromCalls === 1) return qb("single", { area_actual: "mostrador", ruta: "R1" }) as ReturnType<typeof supabase.from>;
      if (fromCalls === 2) return qbDoubleEq([
        { id: "r", from_area: "mostrador", to_area: "diseno", ruta: "R1", multiple: false },
      ]) as ReturnType<typeof supabase.from>;
      if (fromCalls === 3) return qb("eq", null) as ReturnType<typeof supabase.from>;
      return qb("single", { id: "mov1", from_area: "mostrador", to_area: "diseno" }) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: "u1" } } } as never);
    const result = await advancePedido("p1");
    expect(result.to_area).toBe("diseno");
  });

  it("lanza error si pedido no existe", async () => {
    vi.mocked(supabase.from).mockReturnValue(qb("single", null, new Error("not found")) as ReturnType<typeof supabase.from>);
    await expect(advancePedido("p1")).rejects.toThrow("Pedido no encontrado");
  });

  it("requiere destino en rutas multiples", async () => {
    let fromCalls = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      fromCalls++;
      if (fromCalls === 1) return qb("single", { area_actual: "impresion", ruta: "R1" }) as ReturnType<typeof supabase.from>;
      return qbDoubleEq([
        { id: "r", from_area: "impresion", to_area: "laminado", ruta: "R1", multiple: true },
        { id: "r2", from_area: "impresion", to_area: "montaje", ruta: "R1", multiple: true },
      ]) as ReturnType<typeof supabase.from>;
    });
    await expect(advancePedido("p1")).rejects.toThrow("Debe seleccionar un destino");
  });

  it("avanza con destino especifico", async () => {
    let fromCalls = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      fromCalls++;
      if (fromCalls === 1) return qb("single", { area_actual: "impresion", ruta: "R1" }) as ReturnType<typeof supabase.from>;
      if (fromCalls === 2) return qbDoubleEq([
        { id: "r", from_area: "impresion", to_area: "laminado", ruta: "R1", multiple: true },
        { id: "r2", from_area: "impresion", to_area: "montaje", ruta: "R1", multiple: true },
      ]) as ReturnType<typeof supabase.from>;
      if (fromCalls === 3) return qb("eq", null) as ReturnType<typeof supabase.from>;
      return qb("single", { id: "mov1", from_area: "impresion", to_area: "montaje" }) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: "u1" } } } as never);
    const result = await advancePedido("p1", "montaje");
    expect(result.to_area).toBe("montaje");
  });

  it("lanza error si destino invalido", async () => {
    let fromCalls = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      fromCalls++;
      if (fromCalls === 1) return qb("single", { area_actual: "impresion", ruta: "R1" }) as ReturnType<typeof supabase.from>;
      return qbDoubleEq([
        { id: "r", from_area: "impresion", to_area: "laminado", ruta: "R1", multiple: true },
      ]) as ReturnType<typeof supabase.from>;
    });
    await expect(advancePedido("p1", "books")).rejects.toThrow('"books" no es un destino válido desde "impresion"');
  });
});

describe("fetchPedidosByArea", () => {
  it("retorna pedidos", async () => {
    const b = qb();
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: "p1" }], error: null }) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    expect(await fetchPedidosByArea(["diseno"])).toEqual([{ id: "p1" }]);
  });
});

describe("fetchUserRole", () => {
  it("retorna rol del usuario autenticado", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: "u1" } } } as never);
    vi.mocked(supabase.from).mockReturnValue(qb("single", { rol: "admin" }) as ReturnType<typeof supabase.from>);
    expect(await fetchUserRole()).toBe("admin");
  });

  it("retorna null sin sesion", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: new Error("none") } as never);
    expect(await fetchUserRole()).toBeNull();
  });

  it("retorna null sin perfil", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: "u1" } } } as never);
    vi.mocked(supabase.from).mockReturnValue(qb("single", null, new Error("none")) as ReturnType<typeof supabase.from>);
    expect(await fetchUserRole()).toBeNull();
  });
});

describe("regresarPedido", () => {
  beforeEach(() => vi.clearAllMocks());

  it("regresa el pedido al area anterior", async () => {
    let fromCalls = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      fromCalls++;
      if (fromCalls === 1) return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({
          data: [{ from_area: "mostrador" }], error: null,
        }),
      } as ReturnType<typeof supabase.from>;
      if (fromCalls === 2) return qb("single", { area_actual: "diseno" }) as ReturnType<typeof supabase.from>;
      if (fromCalls === 3) return qb("eq", null) as ReturnType<typeof supabase.from>;
      return qb("single", { id: "mov1", from_area: "diseno", to_area: "mostrador" }) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: "u1" } } } as never);
    const result = await regresarPedido("p1");
    expect(result.to_area).toBe("mostrador");
  });

  it("lanza error si no hay movimientos previos", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as ReturnType<typeof supabase.from>);
    await expect(regresarPedido("p1")).rejects.toThrow("Sin movimientos previos");
  });

  it("lanza error si from_area es null", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({
        data: [{ from_area: null }], error: null,
      }),
    } as ReturnType<typeof supabase.from>);
    await expect(regresarPedido("p1")).rejects.toThrow("ya está en su área de origen");
  });

  it("lanza error si pedido no existe", async () => {
    let fromCalls = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      fromCalls++;
      if (fromCalls === 1) return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({
          data: [{ from_area: "mostrador" }], error: null,
        }),
      } as ReturnType<typeof supabase.from>;
      return qb("single", null, new Error("not found")) as ReturnType<typeof supabase.from>;
    });
    await expect(regresarPedido("p1")).rejects.toThrow("Pedido no encontrado");
  });
});
