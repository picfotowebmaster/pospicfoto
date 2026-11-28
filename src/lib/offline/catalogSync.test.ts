import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  syncCatalogFromServer,
  getCatalogFromCache,
  isCatalogStale,
  loadCatalog,
  refreshCatalog,
} from "./catalogSync";
import { supabase } from "@/lib/supabase/client";
import { fetchAtributosConValores } from "@/lib/services/atributos";
import { fetchCatalogo } from "@/lib/services/catalogo";

vi.mock("@/lib/services/atributos", () => ({
  fetchAtributosConValores: vi.fn().mockResolvedValue([{ id: "a1", nombre: "Material", valores: [] }]),
}));

vi.mock("@/lib/services/catalogo", () => ({
  fetchCatalogo: vi.fn().mockResolvedValue({
    categorias: [],
    productos: [],
    descuentos: [],
  }),
}));

vi.mock("./db", () => ({
  saveCatalogo: vi.fn(),
  getCatalogo: vi.fn(),
  catalogoStaleMs: vi.fn(),
}));

import { saveCatalogo, getCatalogo, catalogoStaleMs } from "./db";

function mockCache(version: number | null) {
  vi.mocked(getCatalogo).mockImplementation(((key: string) => {
    if (key === "catalogoVersion:v1") return Promise.resolve(version);
    if (key === "atributos") return Promise.resolve([{ id: "a1" }]);
    if (key === "marcas") return Promise.resolve([{ id: "m1" }]);
    if (key === "sucursales") return Promise.resolve([{ id: "s1" }]);
    return Promise.resolve(null);
  }) as never);
}

function mockFromOk() {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  } as ReturnType<typeof supabase.from>);
}

describe("syncCatalogFromServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 1, error: null } as never);
    mockCache(null);
  });

  it("sincroniza atributos, marcas, sucursales y guarda la versión", async () => {
    mockFromOk();

    await syncCatalogFromServer();

    expect(saveCatalogo).toHaveBeenCalledWith("atributos", expect.any(Array));
    expect(saveCatalogo).toHaveBeenCalledWith("marcas", expect.any(Array));
    expect(saveCatalogo).toHaveBeenCalledWith("sucursales", expect.any(Array));
    expect(saveCatalogo).toHaveBeenCalledWith("catalogoVersion:v1", 1);
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

  it("no guarda la versión si el catálogo no se pudo descargar", async () => {
    mockFromOk();
    vi.mocked(fetchCatalogo).mockRejectedValueOnce(new Error("sin red"));

    await syncCatalogFromServer();

    expect(saveCatalogo).not.toHaveBeenCalledWith("catalogoVersion:v1", expect.anything());
  });

  it("no guarda la versión si falla la RPC de versión", async () => {
    mockFromOk();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error("rpc") } as never);

    await syncCatalogFromServer();

    expect(saveCatalogo).not.toHaveBeenCalledWith("catalogoVersion:v1", expect.anything());
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

  it("retorna true si tiene mas de 15 minutos", async () => {
    vi.mocked(catalogoStaleMs).mockResolvedValue(16 * 60 * 1000);
    expect(await isCatalogStale()).toBe(true);
  });

  it("retorna false si es reciente", async () => {
    vi.mocked(catalogoStaleMs).mockResolvedValue(2 * 60 * 1000);
    expect(await isCatalogStale()).toBe(false);
  });
});

describe("loadCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 1, error: null } as never);
    mockFromOk();
  });

  it("sincroniza si la versión cambió", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 2, error: null } as never);
    mockCache(1);

    const result = await loadCatalog(true);

    expect(saveCatalogo).toHaveBeenCalledWith("marcas", []);
    expect(saveCatalogo).toHaveBeenCalledWith("catalogoVersion:v1", 2);
    expect(result.marcas).toBeDefined();
  });

  it("no sincroniza si la versión es igual", async () => {
    mockCache(1);

    const result = await loadCatalog(true);

    expect(saveCatalogo).not.toHaveBeenCalled();
    expect(result.marcas).toBeDefined();
  });

  it("usa TTL si la RPC de versión falla y está stale", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error("rpc") } as never);
    vi.mocked(catalogoStaleMs).mockResolvedValue(16 * 60 * 1000);
    mockCache(null);

    await loadCatalog(true);

    expect(saveCatalogo).toHaveBeenCalledWith("marcas", []);
  });

  it("no sincroniza si la RPC de versión falla y está fresco", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error("rpc") } as never);
    vi.mocked(catalogoStaleMs).mockResolvedValue(1 * 60 * 1000);
    mockCache(null);

    await loadCatalog(true);

    expect(saveCatalogo).not.toHaveBeenCalled();
  });

  it("usa solo cache si esta offline", async () => {
    mockCache(null);

    const result = await loadCatalog(false);

    expect(saveCatalogo).not.toHaveBeenCalled();
    expect(result.marcas).toBeDefined();
  });
});

describe("refreshCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 5, error: null } as never);
    mockCache(null);
  });

  it("refresca, guarda atributos, catálogo y versión", async () => {
    const resultado = await refreshCatalog();

    expect(resultado.atributos).toEqual([
      { id: "a1", nombre: "Material", valores: [] },
    ]);
    expect(resultado.catalogo).toEqual({
      categorias: [],
      productos: [],
      descuentos: [],
    });
    expect(saveCatalogo).toHaveBeenCalledWith("atributos", resultado.atributos);
    expect(saveCatalogo).toHaveBeenCalledWith(
      "catalogoProductos:v3",
      resultado.catalogo,
    );
    expect(saveCatalogo).toHaveBeenCalledWith("catalogoVersion:v1", 5);
  });

  it("con force:false y versión igual no descarga nada", async () => {
    mockCache(5);

    const resultado = await refreshCatalog({ force: false });

    expect(resultado.catalogo).toEqual({
      categorias: [],
      productos: [],
      descuentos: [],
    });
    expect(fetchAtributosConValores).not.toHaveBeenCalled();
    expect(fetchCatalogo).not.toHaveBeenCalled();
  });
});
