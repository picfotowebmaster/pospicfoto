import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ModalCancelarPedido } from "./ModalCancelarPedido";
import type { Pedido } from "@/lib/supabase/types";

const pedido = {
  id: "p1",
  numero_pedido: "PIC-001",
  cliente_nombre: "Ana López",
  estado: "pendiente",
  area_actual: "mostrador",
  factura_uuid: null,
  factura_estado: null,
  factura_global_id: null,
  sucursal_id: "suc-1",
  anticipo: 0,
  total: 100,
  saldo_cobrado: false,
} as unknown as Pedido;

const autorizadores = [
  { id: "a1", nombre: "Camila", email: "camila@picfoto.mx", rol: "admin" },
  { id: "a2", nombre: "Otro", email: "otro@picfoto.mx", rol: "superadmin" },
];

function renderModal(
  overrides: Partial<Parameters<typeof ModalCancelarPedido>[0]> = {},
) {
  const props = {
    pedido,
    perfil: { rol: "admin" as string | null },
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(<ModalCancelarPedido {...props} />);
  return props;
}

function mockFetchAutorizadores(
  lista = autorizadores,
  ok = true,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () =>
      ok
        ? { autorizadores: lista }
        : { error: "No se pudieron cargar los administradores." },
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ModalCancelarPedido", () => {
  it("admin cancela sin pedir autorización", () => {
    const fetchMock = mockFetchAutorizadores();
    const { onConfirm } = renderModal();

    expect(screen.queryByLabelText("Administrador que autoriza")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar venta" }));

    expect(onConfirm).toHaveBeenCalledWith({
      motivo: "cliente_cancela",
      notas: "",
      autorizacion: undefined,
    });
  });

  it("mostrador selecciona al admin y envía adminId + contraseña", async () => {
    mockFetchAutorizadores();
    const { onConfirm } = renderModal({
      perfil: { rol: "mostrador", sucursal_id: "suc-1" },
    });

    const select = await screen.findByLabelText("Administrador que autoriza");
    await screen.findByRole("option", { name: /Camila/ });

    fireEvent.change(select, { target: { value: "a1" } });
    fireEvent.change(screen.getByLabelText("Contraseña del administrador"), {
      target: { value: "secreta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar venta" }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        motivo: "cliente_cancela",
        notas: "",
        autorizacion: { adminId: "a1", password: "secreta" },
      }),
    );
  });

  it("pide seleccionar admin y capturar contraseña", async () => {
    mockFetchAutorizadores();
    const { onConfirm } = renderModal({
      perfil: { rol: "mostrador", sucursal_id: "suc-1" },
    });

    await screen.findByRole("option", { name: /Camila/ });

    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar venta" }));

    expect(
      await screen.findByText("Selecciona al administrador que autoriza."),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Administrador que autoriza"), {
      target: { value: "a1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar venta" }));

    expect(
      await screen.findByText("El administrador debe escribir su contraseña."),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("muestra error si no se pueden cargar los administradores", async () => {
    mockFetchAutorizadores([], false);
    renderModal({ perfil: { rol: "mostrador", sucursal_id: "suc-1" } });

    expect(
      await screen.findByText("No se pudieron cargar los administradores."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sí, cancelar venta" }),
    ).toBeDisabled();
  });

  it("avisa cuando no hay administradores disponibles", async () => {
    mockFetchAutorizadores([]);
    renderModal({ perfil: { rol: "mostrador", sucursal_id: "suc-1" } });

    expect(
      await screen.findByText(
        "No hay administradores disponibles para autorizar.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sí, cancelar venta" }),
    ).toBeDisabled();
  });

  it("bloquea la cancelación sin conexión", () => {
    const fetchMock = mockFetchAutorizadores();
    const { onConfirm } = renderModal({
      perfil: { rol: "mostrador", sucursal_id: "suc-1" },
      enLinea: false,
    });

    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Administrador que autoriza")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Sí, cancelar venta" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar venta" }));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
