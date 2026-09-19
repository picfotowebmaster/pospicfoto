import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanTarjeta } from "./KanbanTarjeta";
import type { Pedido } from "@/lib/supabase/types";

function mockPedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: "p-001",
    cliente_nombre: "Juan Perez",
    cliente_telefono: "5512345678",
    fecha_entrega: "2026-12-31",
    hora_entrega: "18:00:00",
    fecha_recepcion: "2026-08-01",
    hora_recepcion: "10:00:00",
    subtotal: 500,
    anticipo: 200,
    total: 500,
    metodo_pago: "Efectivo",
    estado: "en_taller",
    area_actual: "diseno",
    ruta: "R1",
    requiere_correccion: false,
    numero_pedido: "PIC-001",
    detalle_pedidos: [
      { id: "d1", pedido_id: "p-001", producto_nombre: "Foto Canvas", cantidad: 2, precio_unitario: 200, importe_linea: 400, atributos: {} },
      { id: "d2", pedido_id: "p-001", producto_nombre: "Foto Lienzo", cantidad: 1, precio_unitario: 100, importe_linea: 100, atributos: {} },
    ],
    ...overrides,
  } as Pedido;
}

describe("KanbanTarjeta", () => {
  const onAvanzarPedido = vi.fn().mockResolvedValue(undefined);
  const onCancelarPedido = vi.fn().mockResolvedValue(undefined);
  const onRegresarPedido = vi.fn().mockResolvedValue(undefined);
  const onToggleSeleccion = vi.fn();
  const onClickDetalle = vi.fn();

  const baseProps = {
    onAvanzarPedido,
    onCancelarPedido,
    onRegresarPedido,
    onToggleSeleccion,
    onClickDetalle,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el nombre del cliente y numero de pedido", () => {
    const pedido = mockPedido();
    render(
      <KanbanTarjeta
        pedido={pedido}
        nextAreas={[{ destination: "impresion", multiple: false }]}
        {...baseProps}
      />,
    );
    expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    expect(screen.getByText("PIC-001")).toBeInTheDocument();
  });

  it("renderiza el conteo de items y resumen de lineas", () => {
    const pedido = mockPedido();
    render(
      <KanbanTarjeta
        pedido={pedido}
        nextAreas={[{ destination: "impresion", multiple: false }]}
        {...baseProps}
      />,
    );
    expect(screen.getByText("3 unidades")).toBeInTheDocument();
    expect(screen.getByText(/2x Foto Canvas/)).toBeInTheDocument();
  });

  it("renderiza badge de SLA vencido", () => {
    const pedido = mockPedido({ fecha_entrega: "2020-01-01", hora_entrega: "00:00:00" });
    render(
      <KanbanTarjeta
        pedido={pedido}
        nextAreas={[{ destination: "impresion", multiple: false }]}
        {...baseProps}
      />,
    );
    expect(screen.getByText("URGENTE")).toBeInTheDocument();
  });

  it("muestra badge de correccion cuando requiere_correccion es true", () => {
    const pedido = mockPedido({ requiere_correccion: true });
    render(
      <KanbanTarjeta
        pedido={pedido}
        nextAreas={[{ destination: "impresion", multiple: false }]}
        {...baseProps}
      />,
    );
    expect(screen.getByText("Corrección")).toBeInTheDocument();
  });

  it("muestra el tiempo en columna", () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[{ destination: "impresion", multiple: false }]}
        tiempoEnColumna="2 h"
        {...baseProps}
      />,
    );
    expect(screen.getByText("2 h")).toBeInTheDocument();
  });

  it("muestra 'Avanzar' cuando hay un solo destino", () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[{ destination: "impresion", multiple: false }]}
        {...baseProps}
      />,
    );
    expect(screen.getByText("Avanzar")).toBeInTheDocument();
  });

  it("muestra 'Entregar pedido' cuando el destino es entregado", () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[{ destination: "entregado", multiple: false }]}
        {...baseProps}
      />,
    );
    expect(screen.getByText("Entregar pedido")).toBeInTheDocument();
  });

  it("muestra selector de destino cuando hay multiple", () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[
          { destination: "montaje", multiple: true },
          { destination: "books", multiple: true },
        ]}
        {...baseProps}
      />,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("abre el confirm modal al hacer clic en Entregar pedido", async () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[{ destination: "entregado", multiple: false }]}
        {...baseProps}
      />,
    );
    await userEvent.click(screen.getByText("Entregar pedido"));
    const matches = screen.getAllByText("Confirmar entrega");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("abre confirm modal al hacer clic en Cancelar", async () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[]}
        {...baseProps}
      />,
    );
    await userEvent.click(screen.getByText("Cancelar"));
    expect(screen.getByText("Cancelar pedido")).toBeInTheDocument();
  });

  it("abre confirm modal al hacer clic en Regresar", async () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[]}
        {...baseProps}
      />,
    );
    await userEvent.click(screen.getByText("Regresar"));
    expect(screen.getByText("Regresar pedido")).toBeInTheDocument();
  });

  it("llama onClickDetalle al hacer clic en la tarjeta", async () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[]}
        {...baseProps}
      />,
    );
    const card = screen.getByText("Juan Perez").closest("div[class*='bg-white']");
    await userEvent.click(card!);
    expect(onClickDetalle).toHaveBeenCalled();
  });

  it("no llama onClickDetalle en modo seleccion", async () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[]}
        modoSeleccion={true}
        isSelected={false}
        {...baseProps}
      />,
    );
    const card = screen.getByText("Juan Perez").closest("div[class*='bg-white']");
    await userEvent.click(card!);
    expect(onClickDetalle).not.toHaveBeenCalled();
  });

  it("muestra checkbox en modo seleccion", () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[]}
        modoSeleccion={true}
        isSelected={false}
        {...baseProps}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("resalta tarjeta cuando isSelected es true", () => {
    const { container } = render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[]}
        modoSeleccion={true}
        isSelected={true}
        {...baseProps}
      />,
    );
    const card = container.querySelector("[class*='ring-blue']");
    expect(card).toBeTruthy();
  });

  it("expande lineas al hacer clic en N productos", async () => {
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[]}
        {...baseProps}
      />,
    );
    const toggle = screen.getByText(/2 productos/);
    await userEvent.click(toggle);
    expect(screen.getByText("1x Foto Lienzo")).toBeInTheDocument();
  });

  it("desactiva el boton avanzar mientras procesa", async () => {
    onAvanzarPedido.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(
      <KanbanTarjeta
        pedido={mockPedido()}
        nextAreas={[{ destination: "impresion", multiple: false }]}
        {...baseProps}
      />,
    );
    await userEvent.click(screen.getByText("Avanzar"));
    await waitFor(() => expect(screen.getByText("Procesando...")).toBeInTheDocument());
  });
});
