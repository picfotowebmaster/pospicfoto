import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/lib/supabase/client";
import { fetchComentarios, crearComentario, eliminarComentario, subirFotoPedido } from "./comentarios";

function qb(terminalMethod: string | null = null, data: unknown = null, error: Error | null = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "insert", "delete", "eq", "order", "single"];
  for (const m of methods) {
    builder[m] = terminalMethod === m
      ? vi.fn().mockResolvedValue(error ? { data, error } : { data, error: null })
      : vi.fn().mockReturnThis();
  }
  return builder;
}

describe("comentarios service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchComentarios devuelve la lista", async () => {
    const rows = [{ id: "c1", pedido_id: "p1", autor_id: "u1", tipo: "comentario", texto: "Hola", foto_url: null, created_at: "2026-06-01T10:00:00Z" }];
    vi.mocked(supabase.from).mockReturnValue(
      qb("order", rows) as unknown as ReturnType<typeof supabase.from>,
    );
    const result = await fetchComentarios("p1");
    expect(result).toHaveLength(1);
    expect(result[0].texto).toBe("Hola");
  });

  it("crearComentario inserta y devuelve el registro", async () => {
    const row = { id: "c1", pedido_id: "p1", autor_id: "u1", tipo: "incidencia", texto: "Falta marco", foto_url: null, created_at: "2026-06-01T10:00:00Z" };
    const b = qb("single", row);
    vi.mocked(supabase.from).mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await crearComentario({ pedidoId: "p1", autorId: "u1", texto: "Falta marco", tipo: "incidencia" });
    expect(result.id).toBe("c1");
    expect(b.insert).toHaveBeenCalledWith({
      pedido_id: "p1",
      autor_id: "u1",
      texto: "Falta marco",
      tipo: "incidencia",
      foto_url: null,
    });
  });

  it("crearComentario usa tipo comentario por defecto", async () => {
    const b = qb("single", { id: "c1" });
    vi.mocked(supabase.from).mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await crearComentario({ pedidoId: "p1", autorId: "u1", texto: "ok" });
    expect(b.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "comentario" }),
    );
  });

  it("eliminarComentario propaga el error", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      qb("eq", null, new Error("no permitido")) as unknown as ReturnType<typeof supabase.from>,
    );
    await expect(eliminarComentario("c1")).rejects.toThrow("no permitido");
  });

  it("subirFotoPedido sube el archivo y devuelve la URL pública", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "p1/x.png" }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn/p1/x.png" } });
    (supabase as unknown as { storage: unknown }).storage = {
      from: vi.fn().mockReturnValue({ upload, getPublicUrl }),
    };

    const file = new File(["x"], "foto.png", { type: "image/png" });
    const url = await subirFotoPedido(file, "p1");

    expect(url).toBe("https://cdn/p1/x.png");
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("subirFotoPedido propaga el error de subida", async () => {
    (supabase as unknown as { storage: unknown }).storage = {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: new Error("sin espacio") }),
        getPublicUrl: vi.fn(),
      }),
    };
    const file = new File(["x"], "foto.png", { type: "image/png" });
    await expect(subirFotoPedido(file, "p1")).rejects.toThrow("sin espacio");
  });
});
