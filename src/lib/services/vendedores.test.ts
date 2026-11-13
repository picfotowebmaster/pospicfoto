import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase/client";
import {
  etiquetaVendedor,
  indexarVendedores,
  listarVendedores,
  nombreVendedor,
  vendedoresParaFiltro,
} from "./vendedores";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listarVendedores", () => {
  it("mapea perfiles, email y usa nombre por defecto", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          id: "u1",
          nombre: "Jessica Herrera",
          email: "jess@correo.com",
          rol: "mostrador",
        },
        { id: "u2", nombre: "  ", email: "admin@correo.com", rol: "admin" },
      ],
      error: null,
    });

    const vendedores = await listarVendedores();

    expect(supabase.rpc).toHaveBeenCalledWith("listar_vendedores");
    expect(vendedores).toEqual([
      {
        id: "u1",
        nombre: "Jessica Herrera",
        email: "jess@correo.com",
        rol: "mostrador",
      },
      {
        id: "u2",
        nombre: "Sin nombre",
        email: "admin@correo.com",
        rol: "admin",
      },
    ]);
  });

  it("propaga errores", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new Error("fail"),
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("fail"),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    await expect(listarVendedores()).rejects.toThrow("fail");
  });

  it("usa profiles si la RPC aún no está aplicada", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new Error("function not found"),
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: "u1", nombre: "Jesus", rol: "mostrador" }],
        error: null,
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const vendedores = await listarVendedores();

    expect(vendedores).toEqual([
      {
        id: "u1",
        nombre: "Jesus",
        email: null,
        rol: "mostrador",
      },
    ]);
  });
});

describe("vendedoresParaFiltro", () => {
  it("solo incluye roles que pueden vender", () => {
    const filtrados = vendedoresParaFiltro([
      {
        id: "u1",
        nombre: "Ventas",
        email: "ventas@correo.com",
        rol: "mostrador",
      },
      { id: "u2", nombre: "Admin", email: "admin@correo.com", rol: "admin" },
      { id: "u3", nombre: "Diseño", email: "diseno@correo.com", rol: "diseno" },
      {
        id: "u4",
        nombre: "Contador",
        email: "contador@correo.com",
        rol: "contador",
      },
    ]);

    expect(filtrados.map((v) => v.id)).toEqual(["u1", "u2"]);
  });
});

describe("nombreVendedor", () => {
  it("resuelve el nombre y usa fallback", () => {
    const mapa = indexarVendedores([
      {
        id: "u1",
        nombre: "Jessica",
        email: "jess@correo.com",
        rol: "mostrador",
      },
    ]);

    expect(nombreVendedor("u1", mapa)).toBe(
      "Jessica (jess@correo.com)",
    );
    expect(nombreVendedor("u2", mapa)).toBe("Sin vendedor");
    expect(nombreVendedor(null, mapa)).toBe("Sin vendedor");
  });
});

describe("etiquetaVendedor", () => {
  it("incluye el email para desambiguar nombres", () => {
    expect(
      etiquetaVendedor({
        id: "u1",
        nombre: "Jesus",
        email: "jesus@picfoto.mx",
        rol: "mostrador",
      }),
    ).toBe("Jesus (jesus@picfoto.mx)");
    expect(
      etiquetaVendedor({
        id: "u2",
        nombre: "Jesus",
        email: null,
        rol: "superadmin",
      }),
    ).toBe("Jesus");
  });
});
