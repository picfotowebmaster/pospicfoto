import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncCatalogFromServer, getCatalogFromCache, isCatalogStale, loadCatalog } from "./catalogSync";
import { supabase } from "@/lib/supabase/client";

vi.mock("@/lib/services/atributos", () => ({
  fetchAtributosConValores: vi.fn().mockResolvedValue([{ id: "a1", nombre: "Material", valores: [] }]),
}));

vi.mock("./db", () => ({
  saveCatalogo: vi.fn(),
  getCatalogo: vi.fn(),
  catalogoStaleMs: vi.fn(),
}));

import { saveCatalogo, getCatalogo, catalogoStaleMs } from "./db";

describe("syncCatalogFromServer", () => {
  it("sincroniza atributos, marcas y sucursales", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: "m1", nombre: "Picfoto", codigo: "PIC" }], error: null }),
    } as ReturnType<typeof supabase.from>);

    await syncCatalogFromServer();

    expect(saveCatalogo).toHaveBeenCalledWith("atributos", expect.any(Array));
    expect(saveCatalogo).toHaveBeenCalledWith("marcas", expect.any(Array));
    expect(saveCatalogo).toHaveBeenCalledWith("sucursales", expect.any(Array));
  });

  it("no lanza error si marcas falla", async () => {
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return {
          select: vi.fn().mockResolvedValue({ data: null, error: new Error("fail") }),
        } as ReturnType<typeof supabase.from>;
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [{ id: "s1", nombre: "Palma", codigo: "PAL" }], error: null }),
      } as ReturnType<typeof supabase.from>;
    });

    await expect(syncCatalogFromServer()).resolves.toBeUndefined();
  });
});

describe("getCatalogFromCache", () => {
  it("retorna datos cacheados", async () => {
    vi.mocked(getCatalogo)
      .mockResolvedValueOnce([{ id: "a1", nombre: "Material" }])
      .mockResolvedValueOnce([{ id: "m1", nombre: "Picfoto" }])
      .mockResolvedValueOnce([{ id: "s1", nombre: "Palma" }]);

    const result = await getCatalogFromCache();
    expect(result.atributos).toEqual([{ id: "a1", nombre: "Material" }]);
    expect(result.marcas).toEqual([{ id: "m1", nombre: "Picfoto" }]);
    expect(result.sucursales).toEqual([{ id: "s1", nombre: "Palma" }]);
  });
});

describe("isCatalogStale", () => {
  it("retorna true si no hay cache", async () => {
    vi.mocked(catalogoStaleMs).mockResolvedValue(null);
    expect(await isCatalogStale()).toBe(true);
  });

  it("retorna true si tiene mas de 5 minutos", async () => {
    vi.mocked(catalogoStaleMs).mockResolvedValue(6 * 60 * 1000);
    expect(await isCatalogStale()).toBe(true);
  });

  it("retorna false si es reciente", async () => {
    vi.mocked(catalogoStaleMs).mockResolvedValue(2 * 60 * 1000);
    expect(await isCatalogStale()).toBe(false);
  });
});

describe("loadCatalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sincroniza si esta stale y online", async () => {
    vi.mocked(catalogoStaleMs).mockResolvedValue(10 * 60 * 1000);
    vi.mocked(getCatalogo)
      .mockResolvedValueOnce([{ id: "a1" }])
      .mockResolvedValueOnce([{ id: "m1" }])
      .mockResolvedValueOnce([{ id: "s1" }]);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as ReturnType<typeof supabase.from>);

    const result = await loadCatalog(true);

    expect(saveCatalogo).toHaveBeenCalledWith("marcas", []);
    expect(result.marcas).toBeDefined();
  });

  it("no sincroniza si esta fresco", async () => {
    vi.mocked(catalogoStaleMs).mockResolvedValue(1 * 60 * 1000);
    vi.mocked(getCatalogo)
      .mockResolvedValueOnce([{ id: "a1" }])
      .mockResolvedValueOnce([{ id: "m1" }])
      .mockResolvedValueOnce([{ id: "s1" }]);

    const result = await loadCatalog(true);

    expect(saveCatalogo).not.toHaveBeenCalled();
    expect(result.marcas).toBeDefined();
  });

  it("usa solo cache si esta offline", async () => {
    vi.mocked(getCatalogo)
      .mockResolvedValueOnce([{ id: "a1" }])
      .mockResolvedValueOnce([{ id: "m1" }])
      .mockResolvedValueOnce([{ id: "s1" }]);

    const result = await loadCatalog(false);

    expect(saveCatalogo).not.toHaveBeenCalled();
    expect(result.marcas).toBeDefined();
  });
});
