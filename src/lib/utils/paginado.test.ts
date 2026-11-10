import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./paginado";

describe("fetchAllPages", () => {
  it("recorre todas las páginas hasta una incompleta", async () => {
    const fetchPage = vi.fn(async (from: number) => ({
      data:
        from === 0
          ? Array.from({ length: 1000 }, (_, i) => ({ id: i }))
          : Array.from({ length: 500 }, (_, i) => ({ id: 1000 + i })),
      error: null,
    }));

    const filas = await fetchAllPages<{ id: number }>(fetchPage);

    expect(filas).toHaveLength(1500);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it("se detiene cuando la página viene incompleta", async () => {
    const fetchPage = vi.fn(async () => ({
      data: [{ id: 1 }],
      error: null,
    }));

    const filas = await fetchAllPages<{ id: number }>(fetchPage);

    expect(filas).toEqual([{ id: 1 }]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("propaga el error", async () => {
    const fetchPage = vi.fn(async () => ({
      data: null,
      error: { message: "boom" },
    }));

    await expect(
      fetchAllPages<{ id: number }>(fetchPage),
    ).rejects.toEqual({ message: "boom" });
  });
});
