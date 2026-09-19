import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/lib/supabase/client";
import { buscarHistorial, upsertHistorial } from "./historial";

describe("buscarHistorial", () => {
  it("retorna array vacio si termino tiene menos de 2 caracteres", async () => {
    const result = await buscarHistorial("a");
    expect(result).toEqual([]);
  });

  it("busca productos con ilike y ordena por veces_usado", async () => {
    const mockData = [
      { id: "h1", nombre: "Foto 4x6", atributos: {}, veces_usado: 10, ultimo_uso: "" },
      { id: "h2", nombre: "Foto 5x7", atributos: {}, veces_usado: 5, ultimo_uso: "" },
    ];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as ReturnType<typeof supabase.from>);

    const result = await buscarHistorial("Foto");
    expect(result).toEqual(mockData);
  });

  it("lanza error si la query falla", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
    } as ReturnType<typeof supabase.from>);

    await expect(buscarHistorial("Foto")).rejects.toThrow("DB error");
  });

  it("respeta el limit de 10 resultados", async () => {
    const mockData = Array.from({ length: 10 }, (_, i) => ({
      id: `h${i}`, nombre: `Producto ${i}`, atributos: {}, veces_usado: i, ultimo_uso: "",
    }));
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as ReturnType<typeof supabase.from>);

    const result = await buscarHistorial("Producto");
    expect(result).toHaveLength(10);
  });
});

describe("upsertHistorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea nuevo historial si no existe", async () => {
    let called = false;
    vi.mocked(supabase.from).mockImplementation((table: unknown) => {
      const t = table as string;
      if (t === "productos_historial" && !called) {
        called = true;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as ReturnType<typeof supabase.from>;
      }
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "new-h", nombre: "Nuevo", atributos: {}, veces_usado: 1, ultimo_uso: "" },
          error: null,
        }),
      } as ReturnType<typeof supabase.from>;
    });

    const result = await upsertHistorial("Nuevo", {});
    expect(result.nombre).toBe("Nuevo");
    expect(result.veces_usado).toBe(1);
  });

  it("incrementa contador si ya existe", async () => {
    const existing = { id: "h1", nombre: "Foto 4x6", atributos: {}, veces_usado: 5, ultimo_uso: "" };
    let firstCall = true;
    vi.mocked(supabase.from).mockImplementation((table: unknown) => {
      if ((table as string) === "productos_historial" && firstCall) {
        firstCall = false;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
        } as ReturnType<typeof supabase.from>;
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { ...existing, veces_usado: 6 }, error: null }),
      } as ReturnType<typeof supabase.from>;
    });

    const result = await upsertHistorial("Foto 4x6", {});
    expect(result.veces_usado).toBe(6);
  });
});
