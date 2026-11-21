import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  serverClient: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
  verifier: {
    auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
  insertMock: vi.fn(),
  notificarCancelacion: vi.fn(),
  obtenerAutorizador: vi.fn(),
  createServerClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [] })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/services/cancelacionNotificaciones", () => ({
  notificarCancelacionAdministradores: mocks.notificarCancelacion,
}));

vi.mock("@/lib/services/autorizadoresCancelacion", () => ({
  obtenerAutorizadorPorId: mocks.obtenerAutorizador,
}));

import { POST } from "./route";

const pedidoPendiente = {
  id: "p1",
  numero_pedido: "PIC-001",
  cliente_nombre: "Ana López",
  estado: "pendiente",
  area_actual: "mostrador",
  total: 100,
  anticipo: 0,
  saldo_cobrado: false,
  factura_uuid: null,
  factura_estado: null,
  factura_global_id: null,
  sucursal_id: "suc-1",
};

function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.gte = vi.fn(() => b);
  b.single = vi.fn(async () => result);
  b.insert = mocks.insertMock;
  b.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return b;
}

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/pedidos/cancelar", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as Parameters<typeof POST>[0];
}

function configurarPerfilPedido(
  perfil: unknown,
  pedido: unknown = pedidoPendiente,
  intentosFallidos = 0,
) {
  mocks.serverClient.from.mockImplementation((table: string) => {
    if (table === "profiles") return builder({ data: perfil, error: null });
    if (table === "pedidos") return builder({ data: pedido, error: null });
    return builder({ data: null, error: null, count: intentosFallidos });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

  mocks.createServerClient.mockReturnValue(mocks.serverClient);
  mocks.createClient.mockReturnValue(mocks.verifier);
  mocks.insertMock.mockResolvedValue({ error: null });
  mocks.notificarCancelacion.mockResolvedValue(undefined);
  mocks.obtenerAutorizador.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000001",
    nombre: "Camila",
    email: "camila@picfoto.mx",
    rol: "admin",
  });

  mocks.serverClient.auth.getUser.mockResolvedValue({
    data: { user: { id: "u1", email: "mostrador@correo.com" } },
  });
  mocks.serverClient.rpc.mockResolvedValue({
    data: { cancelados: 1 },
    error: null,
  });

  mocks.verifier.auth.signInWithPassword.mockResolvedValue({
    data: { user: { id: "00000000-0000-4000-8000-000000000001", email: "camila@picfoto.mx" } },
    error: null,
  });
  mocks.verifier.auth.signOut.mockResolvedValue({ error: null });
  mocks.verifier.from.mockImplementation(() =>
    builder({ data: { rol: "admin" }, error: null }),
  );
  mocks.verifier.rpc.mockResolvedValue({
    data: { cancelados: 1 },
    error: null,
  });
});

describe("POST /api/pedidos/cancelar", () => {
  it("admin/superadmin cancela directo sin credenciales extra", async () => {
    configurarPerfilPedido({ rol: "admin", sucursal_id: null });

    const res = await POST(request({ id: "p1", motivo: "otro" }));

    expect(res.status).toBe(200);
    expect(mocks.serverClient.rpc).toHaveBeenCalledWith("cancelar_venta", {
      p_pedido_id: "p1",
      p_motivo: "otro",
      p_notas: null,
    });
    expect(mocks.createClient).not.toHaveBeenCalled();

    const body = await res.json();
    expect(body.autorizadoPor).toBe("mostrador@correo.com");
    expect(mocks.notificarCancelacion).toHaveBeenCalledWith(
      expect.objectContaining({
        numeroPedido: "PIC-001",
        clienteNombre: "Ana López",
        total: 100,
        montoPagado: 0,
        motivo: "Otro",
        solicitadoPor: "mostrador@correo.com",
        autorizadoPor: "mostrador@correo.com",
        cancelados: 1,
      }),
    );
  });

  it("mostrador cancela con credenciales válidas de un admin", async () => {
    configurarPerfilPedido({ rol: "mostrador", sucursal_id: "suc-1" });

    const res = await POST(
      request({
        id: "p1",
        motivo: "otro",
        adminId: "00000000-0000-4000-8000-000000000001",
        adminPassword: "secreta",
      }),
    );

    expect(res.status).toBe(200);
    expect(mocks.verifier.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "camila@picfoto.mx",
      password: "secreta",
    });
    expect(mocks.serverClient.rpc).not.toHaveBeenCalled();
    expect(mocks.verifier.rpc).toHaveBeenCalledWith(
      "cancelar_venta",
      expect.objectContaining({
        p_pedido_id: "p1",
        p_motivo: "otro",
        p_notas: expect.stringContaining("Autorizada por camila@picfoto.mx"),
      }),
    );
    expect(mocks.verifier.auth.signOut).toHaveBeenCalled();

    const body = await res.json();
    expect(body.autorizadoPor).toBe("camila@picfoto.mx");
    expect(mocks.insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ exito: true }),
    );
    expect(mocks.notificarCancelacion).toHaveBeenCalledWith(
      expect.objectContaining({
        numeroPedido: "PIC-001",
        solicitadoPor: "mostrador@correo.com",
        autorizadoPor: "camila@picfoto.mx",
        cancelados: 1,
      }),
    );
  });

  it("bloquea tras demasiados intentos fallidos", async () => {
    configurarPerfilPedido(
      { rol: "mostrador", sucursal_id: "suc-1" },
      pedidoPendiente,
      5,
    );

    const res = await POST(
      request({
        id: "p1",
        motivo: "otro",
        adminId: "00000000-0000-4000-8000-000000000001",
        adminPassword: "secreta",
      }),
    );

    expect(res.status).toBe(429);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rechaza credenciales inválidas sin cancelar", async () => {
    configurarPerfilPedido({ rol: "mostrador", sucursal_id: "suc-1" });
    mocks.verifier.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid"),
    });

    const res = await POST(
      request({
        id: "p1",
        motivo: "otro",
        adminId: "00000000-0000-4000-8000-000000000001",
        adminPassword: "mala",
      }),
    );

    expect(res.status).toBe(401);
    expect(mocks.verifier.rpc).not.toHaveBeenCalled();
    expect(mocks.serverClient.rpc).not.toHaveBeenCalled();
    expect(mocks.insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ exito: false }),
    );
    expect(mocks.notificarCancelacion).not.toHaveBeenCalled();
  });

  it("explica cuando el admin requiere verificación en dos pasos", async () => {
    configurarPerfilPedido({ rol: "mostrador", sucursal_id: "suc-1" });
    mocks.verifier.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: {
        name: "AuthApiError",
        message: "MFA required",
        status: 400,
        code: "mfa_required",
      },
    });

    const res = await POST(
      request({
        id: "p1",
        motivo: "otro",
        adminId: "00000000-0000-4000-8000-000000000001",
        adminPassword: "secreta",
      }),
    );

    expect(res.status).toBe(401);
    expect((await res.json()).error).toContain("verificación en dos pasos");
  });

  it("rechaza un adminId que no es administrador o superadmin", async () => {
    configurarPerfilPedido({ rol: "mostrador", sucursal_id: "suc-1" });
    mocks.obtenerAutorizador.mockResolvedValue(null);

    const res = await POST(
      request({
        id: "p1",
        motivo: "otro",
        adminId: "00000000-0000-4000-8000-000000000001",
        adminPassword: "secreta",
      }),
    );

    expect(res.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.verifier.rpc).not.toHaveBeenCalled();
  });

  it("rechaza un adminId con formato inválido", async () => {
    configurarPerfilPedido({ rol: "mostrador", sucursal_id: "suc-1" });

    const res = await POST(
      request({
        id: "p1",
        motivo: "otro",
        adminId: "no-es-uuid",
        adminPassword: "secreta",
      }),
    );

    expect(res.status).toBe(403);
    expect(mocks.obtenerAutorizador).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario autenticado no coincide con el autorizador", async () => {
    configurarPerfilPedido({ rol: "mostrador", sucursal_id: "suc-1" });
    mocks.verifier.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "otro", email: "otro@correo.com" } },
      error: null,
    });

    const res = await POST(
      request({
        id: "p1",
        motivo: "otro",
        adminId: "00000000-0000-4000-8000-000000000001",
        adminPassword: "secreta",
      }),
    );

    expect(res.status).toBe(403);
    expect(mocks.verifier.rpc).not.toHaveBeenCalled();
  });

  it("exige autorización cuando mostrador no envía credenciales", async () => {
    configurarPerfilPedido({ rol: "mostrador", sucursal_id: "suc-1" });

    const res = await POST(request({ id: "p1", motivo: "otro" }));

    expect(res.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rechaza roles sin permiso", async () => {
    configurarPerfilPedido({ rol: "diseno", sucursal_id: "suc-1" });

    const res = await POST(request({ id: "p1", motivo: "otro" }));

    expect(res.status).toBe(403);
    expect(mocks.serverClient.rpc).not.toHaveBeenCalled();
  });

  it("mostrador no autoriza ventas de otra sucursal", async () => {
    configurarPerfilPedido({ rol: "mostrador", sucursal_id: "suc-2" });

    const res = await POST(
      request({
        id: "p1",
        motivo: "otro",
        adminId: "00000000-0000-4000-8000-000000000001",
        adminPassword: "secreta",
      }),
    );

    expect(res.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("bloquea ventas con CFDI vigente", async () => {
    configurarPerfilPedido(
      { rol: "admin", sucursal_id: null },
      { ...pedidoPendiente, factura_uuid: "uuid-1", factura_estado: "emitida" },
    );

    const res = await POST(request({ id: "p1", motivo: "otro" }));

    expect(res.status).toBe(403);
    expect(mocks.serverClient.rpc).not.toHaveBeenCalled();
  });
});
