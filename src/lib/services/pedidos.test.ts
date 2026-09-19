import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/lib/supabase/client";
import { crearPedido, fetchPedido, fetchPedidosPorEstado, cancelarPedido, listarPedidos, actualizarPedido } from "./pedidos";
import type { PedidoDraft } from "@/lib/supabase/types";

vi.mock("@/lib/services/historial", () => ({
  upsertHistorial: vi.fn().mockResolvedValue({ id: "h1", nombre: "", atributos: {}, veces_usado: 1, ultimo_uso: "" }),
}));

const mockDraft: PedidoDraft = {
  cliente_nombre: "Juan Perez",
  cliente_telefono: "5512345678",
  fecha_entrega: "2026-07-26",
  hora_entrega: "14:00",
  requiere_correccion: false,
  lineas: [{ id: "l1", producto_nombre: "Foto 4x6", cantidad: 10, precio_unitario: 15, atributos: {}, ruta: "R1" }],
  subtotal: 150,
  anticipo: 105,
  total: 150,
  metodo_pago: "Efectivo",
  ruta: "R1",
  sucursal_id: "s1",
  marca_id: "m1",
};

function qb(terminalMethod: string | null = null, data: unknown = null, error: Error | null = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "gt", "gte", "lt", "lte", "ilike", "in", "order", "limit", "range", "single", "maybeSingle"];
  for (const m of methods) {
    builder[m] = terminalMethod === m
      ? vi.fn().mockResolvedValue(error ? { data, error } : { data, error: null })
      : vi.fn().mockReturnThis();
  }
  if (terminalMethod && !methods.includes(terminalMethod)) {
    builder[terminalMethod] = vi.fn().mockResolvedValue(error ? { data, error } : { data, error: null });
  }
  return builder;
}

function mockFrom(impl: (table: string) => ReturnType<typeof supabase.from>) {
  vi.mocked(supabase.from).mockImplementation((table: unknown) => impl(table as string));
}

describe("crearPedido", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea pedido exitosamente", async () => {
    let fromCalls = 0;
    mockFrom((table: string) => {
      fromCalls++;
      if (table === "marcas") return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales") return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
      if (table === "pedidos") return qb("single", { id: "p1", numero_pedido: "PIC-PAL-00042" }) as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: "PIC-PAL-00042", error: null });

    const result = await crearPedido(mockDraft, "cajero-1");
    expect(result).toBe("PIC-PAL-00042");
  });

  it("lanza error si marca no encontrada", async () => {
    mockFrom(() => qb("single", null) as ReturnType<typeof supabase.from>);
    await expect(crearPedido(mockDraft, "cajero-1")).rejects.toThrow("Marca o sucursal no encontrada");
  });

  it("lanza error si RPC falla", async () => {
    mockFrom((table: string) => {
      if (table === "marcas") return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error("RPC error") });
    await expect(crearPedido(mockDraft, "cajero-1")).rejects.toThrow("RPC error");
  });

  it("lanza error si insert falla", async () => {
    mockFrom((table: string) => {
      if (table === "marcas") return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales") return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
      if (table === "pedidos") return qb("single", null, new Error("Insert error")) as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: "PIC-PAL-00042", error: null });
    await expect(crearPedido(mockDraft, "cajero-1")).rejects.toThrow("Insert error");
  });
});

describe("fetchPedido", () => {
  const mockPedido = { id: "abc-123-uuid", numero_pedido: "PIC-PAL-00042", cliente_nombre: "Juan", detalle_pedidos: [] };

  it("busca por UUID", async () => {
    vi.mocked(supabase.from).mockReturnValue(qb("single", mockPedido) as ReturnType<typeof supabase.from>);
    expect(await fetchPedido("abc-123-uuid-1234-567890abcdef")).toEqual(mockPedido);
  });

  it("busca por numero_pedido", async () => {
    const eq = vi.fn().mockReturnThis();
    const builder = { ...qb("single", mockPedido), eq };
    vi.mocked(supabase.from).mockReturnValue(builder as ReturnType<typeof supabase.from>);
    const result = await fetchPedido("PIC-PAL-00042");
    expect(eq).toHaveBeenCalledWith("numero_pedido", "PIC-PAL-00042");
    expect(result).toEqual(mockPedido);
  });

  it("lanza error si falla", async () => {
    vi.mocked(supabase.from).mockReturnValue(qb("single", null, new Error("Not found")) as ReturnType<typeof supabase.from>);
    await expect(fetchPedido("abc-def-uuid")).rejects.toThrow("Not found");
  });
});

describe("fetchPedidosPorEstado", () => {
  it("retorna pedidos", async () => {
    const b = qb(null, [{ id: "1" }]);
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    expect(await fetchPedidosPorEstado(["pendiente"])).toEqual([{ id: "1" }]);
  });

  it("lanza error", async () => {
    const b = qb();
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockRejectedValue(new Error("DB error")) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    await expect(fetchPedidosPorEstado(["pendiente"])).rejects.toThrow("DB error");
  });
});

describe("cancelarPedido", () => {
  it("cambia a cancelado con movimiento", async () => {
    let fromCalls = 0;
    mockFrom((table: string) => {
      fromCalls++;
      if (fromCalls === 1) return qb("single", { area_actual: "mostrador" }) as ReturnType<typeof supabase.from>;
      if (fromCalls === 2) return qb("eq", null) as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: "user-1" } } } as never);
    await expect(cancelarPedido("p1")).resolves.toBeUndefined();
  });
});

describe("listarPedidos", () => {
  it("pagina con hasMore", async () => {
    const mockPedidos = Array.from({ length: 15 }, (_, i) => ({ id: `p${i}`, cliente_nombre: `C${i}`, detalle_pedidos: [] }));
    const b = qb();
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range: vi.fn().mockResolvedValue({ data: mockPedidos, error: null }) }) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    const result = await listarPedidos({ pagina: 1, porPagina: 10 });
    expect(result.pedidos).toHaveLength(10);
    expect(result.hasMore).toBe(true);
  });

  it("hasMore false", async () => {
    const mockPedidos = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, cliente_nombre: `C${i}`, detalle_pedidos: [] }));
    const b = qb();
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range: vi.fn().mockResolvedValue({ data: mockPedidos, error: null }) }) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    const result = await listarPedidos({ pagina: 1, porPagina: 20 });
    expect(result.pedidos).toHaveLength(5);
    expect(result.hasMore).toBe(false);
  });
});

describe("actualizarPedido", () => {
  it("reemplaza lineas", async () => {
    mockFrom((table: string) => {
      if (table === "pedidos") return qb("eq", null) as ReturnType<typeof supabase.from>;
      if (table === "detalle_pedidos") return qb("eq", null) as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });

    await actualizarPedido("p1", {
      cliente_nombre: "Updated", fecha_entrega: "2026-08-01", hora_entrega: "10:00",
      requiere_correccion: true, subtotal: 200, anticipo: 140, total: 200,
      metodo_pago: "Tarjeta", ruta: "R2",
      lineas: [{ id: "l1", producto_nombre: "P", cantidad: 1, precio_unitario: 200, atributos: {}, ruta: "R2" }],
    });
    expect(supabase.from).toHaveBeenCalled();
  });
});
