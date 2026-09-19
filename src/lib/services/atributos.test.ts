import { describe, it, expect, vi } from "vitest";
import { supabase } from "@/lib/supabase/client";
import {
  fetchAtributos, fetchValores, fetchAtributosConValores,
  insertAtributo, insertAtributoValor, toggleAtributoActivo,
} from "./atributos";

describe("fetchAtributos", () => {
  it("retorna atributos activos", async () => {
    const mock = [{ id: "a1", nombre: "Material", activo: true }];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mock, error: null }),
    } as ReturnType<typeof supabase.from>);
    expect(await fetchAtributos()).toEqual(mock);
  });

  it("lanza error si falla", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error("fail") }),
    } as ReturnType<typeof supabase.from>);
    await expect(fetchAtributos()).rejects.toThrow("fail");
  });
});

describe("fetchValores", () => {
  it("retorna valores", async () => {
    const mock = [{ id: "v1", atributo_id: "a1", valor: "Canvas" }];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mock, error: null }),
    } as ReturnType<typeof supabase.from>);
    expect(await fetchValores("a1")).toEqual(mock);
  });
});

describe("fetchAtributosConValores", () => {
  it("retorna atributos con valores anidados", async () => {
    const mock = [{
      id: "a1", nombre: "Material", activo: true,
      atributo_valores: [{ id: "v1", atributo_id: "a1", valor: "Canvas" }],
    }];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mock, error: null }),
    } as ReturnType<typeof supabase.from>);
    const result = await fetchAtributosConValores();
    expect(result[0].valores).toHaveLength(1);
    expect(result[0].valores[0].valor).toBe("Canvas");
  });
});

describe("insertAtributo", () => {
  it("crea atributo", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "a3", nombre: "Color", activo: true }, error: null }),
    } as ReturnType<typeof supabase.from>);
    const result = await insertAtributo("Color");
    expect(result.nombre).toBe("Color");
  });
});

describe("insertAtributoValor", () => {
  it("inserta valor", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as ReturnType<typeof supabase.from>);
    await expect(insertAtributoValor("a1", "Rojo")).resolves.toBeUndefined();
  });

  it("ignora duplicados 23505", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { code: "23505", message: "dup" } }),
    } as ReturnType<typeof supabase.from>);
    await expect(insertAtributoValor("a1", "Rojo")).resolves.toBeUndefined();
  });

  it("lanza otros errores", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { code: "23503", message: "fk" } }),
    } as ReturnType<typeof supabase.from>);
    await expect(insertAtributoValor("a1", "Rojo")).rejects.toEqual({ code: "23503", message: "fk" });
  });
});

describe("toggleAtributoActivo", () => {
  it("alterna activo", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }),
    } as ReturnType<typeof supabase.from>);
    await expect(toggleAtributoActivo("a1", false)).resolves.toBeUndefined();
  });
});
