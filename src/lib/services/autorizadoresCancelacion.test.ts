import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, getUserByIdMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getUserByIdMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(function () {
    return {
      from: fromMock,
      auth: { admin: { getUserById: getUserByIdMock } },
    };
  }),
}));

import {
  listarAutorizadoresCancelacion,
  obtenerAutorizadorPorId,
} from "./autorizadoresCancelacion";

function configurarCorreos(correos: Record<string, string | null>) {
  getUserByIdMock.mockImplementation(async (id: string) => ({
    data: { user: { id, email: correos[id] ?? null } },
    error: null,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listarAutorizadoresCancelacion", () => {
  it("devuelve admin y superadmin ordenados y sin correos duplicados", async () => {
    const inMock = vi.fn().mockResolvedValue({
      data: [
        { id: "s1", nombre: "Zoe", rol: "superadmin" },
        { id: "s2", nombre: "Ana", rol: "admin" },
        { id: "s3", nombre: "Duplicado", rol: "admin" },
      ],
      error: null,
    });
    fromMock.mockReturnValue({ select: () => ({ in: inMock }) });
    configurarCorreos({
      s1: "zoe@picfoto.mx",
      s2: "ana@picfoto.mx",
      s3: "ANA@picfoto.mx",
    });

    await expect(listarAutorizadoresCancelacion()).resolves.toEqual([
      { id: "s2", nombre: "Ana", email: "ana@picfoto.mx", rol: "admin" },
      { id: "s1", nombre: "Zoe", email: "zoe@picfoto.mx", rol: "superadmin" },
    ]);
    expect(inMock).toHaveBeenCalledWith("rol", ["admin", "superadmin"]);
  });

  it("omite administradores sin correo", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        in: vi.fn().mockResolvedValue({
          data: [{ id: "s1", nombre: "Sin correo", rol: "admin" }],
          error: null,
        }),
      }),
    });
    configurarCorreos({ s1: null });

    await expect(listarAutorizadoresCancelacion()).resolves.toEqual([]);
  });

  it("devuelve lista vacía si no hay administradores", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    await expect(listarAutorizadoresCancelacion()).resolves.toEqual([]);
  });

  it("propaga errores de la consulta", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        in: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("db caída"),
        }),
      }),
    });

    await expect(listarAutorizadoresCancelacion()).rejects.toThrow("db caída");
  });
});

describe("obtenerAutorizadorPorId", () => {
  it("devuelve el autorizador con su correo", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          in: () => ({
            maybeSingle: async () => ({
              data: { id: "a1", nombre: "Camila", rol: "admin" },
              error: null,
            }),
          }),
        }),
      }),
    });
    configurarCorreos({ a1: "camila@picfoto.mx" });

    await expect(obtenerAutorizadorPorId("a1")).resolves.toEqual({
      id: "a1",
      nombre: "Camila",
      email: "camila@picfoto.mx",
      rol: "admin",
    });
  });

  it("devuelve null si el perfil no es admin/superadmin o no existe", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          in: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    });

    await expect(obtenerAutorizadorPorId("u1")).resolves.toBeNull();
  });

  it("devuelve null si el usuario no tiene correo", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          in: () => ({
            maybeSingle: async () => ({
              data: { id: "a1", nombre: "Camila", rol: "admin" },
              error: null,
            }),
          }),
        }),
      }),
    });
    configurarCorreos({ a1: null });

    await expect(obtenerAutorizadorPorId("a1")).resolves.toBeNull();
  });
});
