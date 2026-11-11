import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCatalogo, saveCatalogo } from "@/lib/offline/db";
import {
  buscarClientesLocal,
  guardarClientesEnCache,
  normalizarEmail,
  normalizarNombre,
  normalizarTelefono,
} from "./clientes";

vi.mock("@/lib/offline/db", () => ({
  getCatalogo: vi.fn(),
  saveCatalogo: vi.fn(),
  catalogoStaleMs: vi.fn(),
}));

describe("normalizarTelefono", () => {
  it("deja solo dígitos y quita lada de México", () => {
    expect(normalizarTelefono("55 1234 5678")).toBe("5512345678");
    expect(normalizarTelefono("+52 55 1234 5678")).toBe("5512345678");
    expect(normalizarTelefono("521 55 1234 5678")).toBe("5512345678");
  });
});

describe("normalizarNombre", () => {
  it("quita acentos, mayúsculas y espacios extra", () => {
    expect(normalizarNombre("  Lilíana   Pérez ")).toBe("liliana perez");
  });
});

describe("normalizarEmail", () => {
  it("recorta y pasa a minúsculas", () => {
    expect(normalizarEmail("  Ana@Correo.COM ")).toBe("ana@correo.com");
  });
});

describe("buscarClientesLocal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCatalogo).mockResolvedValue([
      {
        nombre: "Liliana Pérez",
        telefono: "5551234567",
        email: "liliana@correo.com",
        last_order_at: "2026-11-01T10:00:00.000Z",
        pedidos_count: 3,
      },
      {
        nombre: "Ana López",
        telefono: "5559876543",
        email: "ana@correo.com",
        last_order_at: "2026-10-01T10:00:00.000Z",
        pedidos_count: 1,
      },
    ] as never);
  });

  it("encuentra por nombre sin acentos", async () => {
    const result = await buscarClientesLocal("liliana");
    expect(result.map((c) => c.nombre)).toEqual(["Liliana Pérez"]);
  });

  it("encuentra por teléfono ignorando formato", async () => {
    const result = await buscarClientesLocal("55 5123 4567");
    expect(result.map((c) => c.nombre)).toEqual(["Liliana Pérez"]);
  });

  it("prioriza la coincidencia exacta de correo", async () => {
    const result = await buscarClientesLocal("ana@correo.com");
    expect(result[0]?.nombre).toBe("Ana López");
  });
});

describe("guardarClientesEnCache", () => {
  it("fusiona por teléfono sin duplicar", async () => {
    vi.mocked(getCatalogo).mockResolvedValue([
      {
        nombre: "Liliana",
        telefono: "5551234567",
        email: null,
        last_order_at: "2026-10-01T10:00:00.000Z",
        pedidos_count: 1,
      },
    ] as never);

    await guardarClientesEnCache([
      {
        nombre: "Liliana Pérez",
        telefono: "5551234567",
        email: "liliana@correo.com",
        last_order_at: "2026-11-01T10:00:00.000Z",
        pedidos_count: 2,
      },
    ]);

    expect(saveCatalogo).toHaveBeenCalledWith(
      "clientesCache:v1",
      [
        expect.objectContaining({
          nombre: "Liliana Pérez",
          telefono: "5551234567",
          email: "liliana@correo.com",
          pedidos_count: 2,
        }),
      ],
    );
  });
});
