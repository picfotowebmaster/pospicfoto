import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  serverClient: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
  createServerClient: vi.fn(),
  listar: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [] })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@/lib/services/autorizadoresCancelacion", () => ({
  listarAutorizadoresCancelacion: mocks.listar,
}));

import { GET } from "./route";

function perfilBuilder(result: unknown) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(async () => result);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

  mocks.createServerClient.mockReturnValue(mocks.serverClient);
  mocks.serverClient.auth.getUser.mockResolvedValue({
    data: { user: { id: "u1" } },
  });
  mocks.serverClient.from.mockReturnValue(
    perfilBuilder({ data: { rol: "mostrador" }, error: null }),
  );
  mocks.listar.mockResolvedValue([
    {
      id: "a1",
      nombre: "Camila",
      email: "camila@picfoto.mx",
      rol: "admin",
    },
  ]);
});

describe("GET /api/pedidos/cancelar/autorizadores", () => {
  it("responde 401 sin sesión", async () => {
    mocks.serverClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(mocks.listar).not.toHaveBeenCalled();
  });

  it("rechaza roles sin permiso", async () => {
    mocks.serverClient.from.mockReturnValue(
      perfilBuilder({ data: { rol: "diseno" }, error: null }),
    );

    const res = await GET();

    expect(res.status).toBe(403);
    expect(mocks.listar).not.toHaveBeenCalled();
  });

  it("devuelve los administradores a mostrador", async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(body.autorizadores).toEqual([
      {
        id: "a1",
        nombre: "Camila",
        email: "camila@picfoto.mx",
        rol: "admin",
      },
    ]);
  });

  it("responde 500 si falla la consulta", async () => {
    mocks.listar.mockRejectedValue(new Error("db caída"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET();

    expect(res.status).toBe(500);
  });
});
