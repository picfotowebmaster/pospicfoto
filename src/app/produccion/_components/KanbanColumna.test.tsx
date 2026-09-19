import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanColumna } from "./KanbanColumna";
import type { Pedido } from "@/lib/supabase/types";

function mockPedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: `p-${Math.random().toString(36).slice(2, 6)}`,
    cliente_nombre: "Cliente Test",
    cliente_telefono: "",
    fecha_entrega: "2026-12-31",
    hora_entrega: "18:00:00",
    fecha_recepcion: "2026-08-01",
    hora_recepcion: "10:00:00",
    subtotal: 100,
    anticipo: 0,
    total: 100,
    metodo_pago: "Efectivo",
    estado: "en_taller",
    area_actual: "diseno",
    ruta: "R1",
    requiere_correccion: false,
    numero_pedido: "P-TEST",
    detalle_pedidos: [],
    ...overrides,
  } as Pedido;
}

function createDataTransfer(data: Record<string, unknown>) {
  return {
    dropEffect: "move",
    effectAllowed: "all",
    getData: (format: string) => (format === "text/plain" ? JSON.stringify(data) : ""),
    setData: vi.fn(),
    setDragImage: vi.fn(),
    items: [],
    files: [],
    types: [],
  } as unknown as DataTransfer;
}

const area = { id: "diseno", nombre: "Diseño", color: "bg-indigo-500", orden: 1 };

describe("KanbanColumna", () => {
  const onAvanzarPedido = vi.fn().mockResolvedValue(undefined);
  const getNextForPedido = vi.fn().mockReturnValue([{ destination: "impresion", multiple: false }]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el nombre del area y el conteo", () => {
    render(
      <KanbanColumna
        area={area}
        pedidos={[mockPedido(), mockPedido()]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    expect(screen.getByText("Diseño")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("muestra 'Sin pedidos' cuando la columna esta vacia", () => {
    render(
      <KanbanColumna
        area={area}
        pedidos={[]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    expect(screen.getByText("Sin pedidos")).toBeInTheDocument();
  });

  it("muestra WIP limit cuando se configura", () => {
    render(
      <KanbanColumna
        area={area}
        pedidos={[mockPedido(), mockPedido(), mockPedido()]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        wipLimit={5}
      />,
    );
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("muestra barra de progreso WIP", () => {
    const { container } = render(
      <KanbanColumna
        area={area}
        pedidos={[mockPedido(), mockPedido()]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        wipLimit={4}
      />,
    );
    expect(screen.getByText("2/4")).toBeInTheDocument();
    const bar = container.querySelector("div[class*='h-1'][class*='rounded-full']");
    expect(bar).toBeTruthy();
  });

  it("colapsa/expande al hacer clic en el boton", async () => {
    const onToggleCollapse = vi.fn();
    const { container } = render(
      <KanbanColumna
        area={area}
        pedidos={[mockPedido()]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        isCollapsed={false}
        onToggleCollapse={onToggleCollapse}
      />,
    );
    const collapseBtn = container.querySelector("i.fa-chevron-up")!.closest("button")!;
    await userEvent.click(collapseBtn);
    expect(onToggleCollapse).toHaveBeenCalled();
  });

  it("colapsado muestra solo conteo de pedidos", () => {
    render(
      <KanbanColumna
        area={area}
        pedidos={[mockPedido(), mockPedido()]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        isCollapsed={true}
      />,
    );
    expect(screen.getByText("2 pedidos")).toBeInTheDocument();
  });

  it("muestra boton de seleccion cuando hay pedidos", () => {
    const onActivarSeleccion = vi.fn();
    const { container } = render(
      <KanbanColumna
        area={area}
        pedidos={[mockPedido()]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        onActivarSeleccion={onActivarSeleccion}
      />,
    );
    expect(container.querySelector("i.fa-check-square")).toBeTruthy();
  });

  it("no muestra boton seleccion sin pedidos", () => {
    const onActivarSeleccion = vi.fn();
    const { container } = render(
      <KanbanColumna
        area={area}
        pedidos={[]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        onActivarSeleccion={onActivarSeleccion}
      />,
    );
    expect(container.querySelector("i.fa-check-square")).toBeNull();
  });

  it("muestra 'Suelta aqui' durante drag over en columna vacia", async () => {
    const { container } = render(
      <KanbanColumna
        area={area}
        pedidos={[]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    const column = container.firstElementChild!;
    const dt = createDataTransfer({ pedidoId: "p-other", hasMultiple: false });
    fireEvent.dragOver(column, { dataTransfer: dt });
    await waitFor(() => expect(screen.getByText("Suelta aquí")).toBeInTheDocument());
  });

  it("aplica ring al hacer drag over", async () => {
    const { container } = render(
      <KanbanColumna
        area={area}
        pedidos={[mockPedido()]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    const column = container.firstElementChild!;
    const dt = createDataTransfer({ pedidoId: "p-other", hasMultiple: false });
    fireEvent.dragOver(column, { dataTransfer: dt });
    await waitFor(() => expect(column.className).toMatch(/ring/));
  });

  it("ordena pedidos por fecha de entrega", () => {
    const p1 = mockPedido({ id: "p1", cliente_nombre: "Temprano", fecha_entrega: "2026-01-01", hora_entrega: "10:00:00" });
    const p2 = mockPedido({ id: "p2", cliente_nombre: "Tarde", fecha_entrega: "2026-12-31", hora_entrega: "10:00:00" });
    const { container } = render(
      <KanbanColumna
        area={area}
        pedidos={[p2, p1]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    const nombres = [...container.querySelectorAll("span[class*='truncate block']")].map((el) => el.textContent);
    expect(nombres[0]).toBe("Temprano");
  });

  it("procesa drop con datos validos", async () => {
    const { container } = render(
      <KanbanColumna
        area={area}
        pedidos={[]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    const column = container.firstElementChild!;
    const dt = createDataTransfer({ pedidoId: "p-other", hasMultiple: false });
    fireEvent.drop(column, { dataTransfer: dt });
    await waitFor(() => expect(onAvanzarPedido).toHaveBeenCalledWith("p-other"));
  });

  it("llama avanzar con destino en drop multi-ruta", async () => {
    const { container } = render(
      <KanbanColumna
        area={area}
        pedidos={[]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    const column = container.firstElementChild!;
    const dt = createDataTransfer({ pedidoId: "p-other", hasMultiple: true });
    fireEvent.drop(column, { dataTransfer: dt });
    await waitFor(() => expect(onAvanzarPedido).toHaveBeenCalledWith("p-other", "diseno"));
  });
});
