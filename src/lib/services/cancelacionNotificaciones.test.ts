import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listarMock, enviarMock } = vi.hoisted(() => ({
  listarMock: vi.fn(),
  enviarMock: vi.fn(),
}));

vi.mock("./autorizadoresCancelacion", () => ({
  listarAutorizadoresCancelacion: listarMock,
}));

vi.mock("./email", () => ({
  enviarCancelacionVenta: enviarMock,
}));

import { notificarCancelacionAdministradores } from "./cancelacionNotificaciones";

const datos = {
  numeroPedido: "PED-1",
  clienteNombre: "Ana",
  total: 100,
  montoPagado: 50,
  motivo: "Otro",
  notas: null,
  solicitadoPor: "mostrador@correo.com",
  autorizadoPor: "camila@picfoto.mx",
  fecha: "2026-11-19 13:00",
  cancelados: 1,
  urlPedidos: "https://pos.picfoto.mx/admin/pedidos",
  urlTicket: "https://pos.picfoto.mx/mostrador/ticket/PED-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  enviarMock.mockResolvedValue("email-id");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notificarCancelacionAdministradores", () => {
  it("envía el aviso a todos los administradores existentes", async () => {
    listarMock.mockResolvedValue([
      { id: "a1", nombre: "Camila", email: "camila@picfoto.mx", rol: "admin" },
      { id: "a2", nombre: "Otro", email: "otro@picfoto.mx", rol: "superadmin" },
    ]);

    await notificarCancelacionAdministradores(datos);

    expect(enviarMock).toHaveBeenCalledTimes(2);
    expect(enviarMock).toHaveBeenCalledWith({
      to: "camila@picfoto.mx",
      ...datos,
    });
    expect(enviarMock).toHaveBeenCalledWith({
      to: "otro@picfoto.mx",
      ...datos,
    });
  });

  it("continúa aunque un envío falle", async () => {
    listarMock.mockResolvedValue([
      { id: "a1", nombre: "Camila", email: "camila@picfoto.mx", rol: "admin" },
      { id: "a2", nombre: "Otro", email: "otro@picfoto.mx", rol: "superadmin" },
    ]);
    enviarMock
      .mockRejectedValueOnce(new Error("resend caído"))
      .mockResolvedValueOnce("email-id");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      notificarCancelacionAdministradores(datos),
    ).resolves.toBeUndefined();
    expect(enviarMock).toHaveBeenCalledTimes(2);
  });

  it("no envía nada si no hay administradores", async () => {
    listarMock.mockResolvedValue([]);

    await notificarCancelacionAdministradores(datos);

    expect(enviarMock).not.toHaveBeenCalled();
  });

  it("no lanza si falla la consulta de administradores", async () => {
    listarMock.mockRejectedValue(new Error("db caída"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      notificarCancelacionAdministradores(datos),
    ).resolves.toBeUndefined();
    expect(enviarMock).not.toHaveBeenCalled();
  });
});
