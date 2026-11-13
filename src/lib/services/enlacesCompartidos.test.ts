import { describe, it, expect, vi, beforeEach } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import {
  crearOReutilizarEnlace,
  enlaceVigente,
  esTokenValido,
  obtenerEnlaceValido,
  revocarEnlacesDePedido,
  type EnlaceCompartido,
} from "./enlacesCompartidos";

interface Resultados {
  maybeSingle?: { data: unknown; error?: unknown };
  single?: { data: unknown; error?: unknown };
}

type Builder = Record<string, ReturnType<typeof vi.fn>>;

function crearBuilder(resultados: Resultados = {}): Builder {
  const builder: Builder = {};
  for (const metodo of [
    "select",
    "eq",
    "is",
    "gt",
    "order",
    "limit",
    "insert",
    "update",
  ]) {
    builder[metodo] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(resultados.maybeSingle ?? { data: null, error: null }),
  );
  builder.single = vi.fn(() =>
    Promise.resolve(resultados.single ?? { data: null, error: null }),
  );
  return builder;
}

const enlaceBase: EnlaceCompartido = {
  id: "enlace-1",
  pedido_id: "pedido-1",
  token: "a".repeat(48),
  created_by: "user-1",
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  revoked_at: null,
  created_at: new Date().toISOString(),
};

describe("enlaceVigente", () => {
  it("acepta un enlace sin revocar y vigente", () => {
    expect(enlaceVigente(enlaceBase)).toBe(true);
  });

  it("rechaza enlaces revocados", () => {
    expect(
      enlaceVigente({ ...enlaceBase, revoked_at: new Date().toISOString() }),
    ).toBe(false);
  });

  it("rechaza enlaces expirados", () => {
    expect(
      enlaceVigente({
        ...enlaceBase,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      }),
    ).toBe(false);
  });
});

describe("esTokenValido", () => {
  it("valida tokens de 48 caracteres hex", () => {
    expect(esTokenValido("a".repeat(48))).toBe(true);
    expect(esTokenValido("A1".repeat(24))).toBe(true);
  });

  it("rechaza tokens con formato incorrecto", () => {
    expect(esTokenValido("abc")).toBe(false);
    expect(esTokenValido("z".repeat(48))).toBe(false);
  });
});

describe("crearOReutilizarEnlace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reutiliza un enlace activo existente", async () => {
    const builder = crearBuilder({
      maybeSingle: { data: enlaceBase, error: null },
    });
    fromMock.mockReturnValue(builder);

    const enlace = await crearOReutilizarEnlace("pedido-1", "user-1");

    expect(enlace).toEqual(enlaceBase);
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it("crea un enlace con token y expiración cuando no existe", async () => {
    const nuevo = { ...enlaceBase, token: "b".repeat(48) };
    const builder = crearBuilder({ single: { data: nuevo, error: null } });
    fromMock.mockReturnValue(builder);

    const enlace = await crearOReutilizarEnlace("pedido-1", "user-1");

    expect(enlace).toEqual(nuevo);
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pedido_id: "pedido-1",
        created_by: "user-1",
        token: expect.stringMatching(/^[0-9a-f]{48}$/),
        expires_at: expect.any(String),
      }),
    );
  });

  it("propaga el error al crear", async () => {
    const builder = crearBuilder({
      single: { data: null, error: { message: "boom" } },
    });
    fromMock.mockReturnValue(builder);

    await expect(
      crearOReutilizarEnlace("pedido-1", "user-1"),
    ).rejects.toThrow("boom");
  });
});

describe("obtenerEnlaceValido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve el enlace cuando está vigente", async () => {
    const builder = crearBuilder({
      maybeSingle: { data: enlaceBase, error: null },
    });
    fromMock.mockReturnValue(builder);

    await expect(obtenerEnlaceValido(enlaceBase.token)).resolves.toEqual(
      enlaceBase,
    );
  });

  it("devuelve null cuando no existe", async () => {
    const builder = crearBuilder({ maybeSingle: { data: null, error: null } });
    fromMock.mockReturnValue(builder);

    await expect(obtenerEnlaceValido(enlaceBase.token)).resolves.toBeNull();
  });

  it("devuelve null cuando expiró", async () => {
    const expirado = {
      ...enlaceBase,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    const builder = crearBuilder({
      maybeSingle: { data: expirado, error: null },
    });
    fromMock.mockReturnValue(builder);

    await expect(obtenerEnlaceValido(enlaceBase.token)).resolves.toBeNull();
  });
});

describe("revocarEnlacesDePedido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca los enlaces activos como revocados", async () => {
    const builder = crearBuilder();
    fromMock.mockReturnValue(builder);

    await revocarEnlacesDePedido("pedido-1");

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) }),
    );
    expect(builder.eq).toHaveBeenCalledWith("pedido_id", "pedido-1");
  });

  it("propaga el error al revocar", async () => {
    const builder = crearBuilder();
    builder.is.mockResolvedValue({ error: { message: "boom" } });
    fromMock.mockReturnValue(builder);

    await expect(revocarEnlacesDePedido("pedido-1")).rejects.toThrow("boom");
  });
});
