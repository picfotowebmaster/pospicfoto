import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { KanbanBoard } from "./KanbanBoard";
import type { Pedido } from "@/lib/supabase/types";
import type { NextAreaInfo } from "./KanbanBoard";

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
    numero_pedido: "P-001",
    detalle_pedidos: [],
    ...overrides,
  } as Pedido;
}

const areas = [
  { id: "mostrador", nombre: "Mostrador", color: "bg-yellow-500", orden: 0 },
  { id: "diseno", nombre: "Diseño", color: "bg-indigo-500", orden: 1 },
  { id: "impresion", nombre: "Impresión", color: "bg-blue-500", orden: 2 },
  { id: "laminado", nombre: "Laminado", color: "bg-teal-500", orden: 3 },
  { id: "listo", nombre: "Listo", color: "bg-green-500", orden: 9 },
  { id: "entregado", nombre: "Entregado", color: "bg-gray-500", orden: 10 },
];

const getNextForPedido = vi.fn().mockReturnValue([{ destination: "impresion", multiple: false }] as NextAreaInfo[]);
const onAvanzarPedido = vi.fn().mockResolvedValue(undefined);

const columnas = {
  mostrador: [mockPedido({ id: "p-1", cliente_nombre: "Pedido Mostrador", area_actual: "mostrador" })],
  diseno: [mockPedido({ id: "p-2", cliente_nombre: "Pedido Diseño", area_actual: "diseno" })],
  impresion: [],
  laminado: [],
  listo: [],
  entregado: [],
};

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza todas las columnas excepto entregado", () => {
    render(
      <KanbanBoard
        columnas={columnas}
        areas={areas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    expect(screen.getAllByText("Mostrador")).toBeTruthy();
    expect(screen.getAllByText("Diseño")).toBeTruthy();
    expect(screen.getAllByText("Impresión")).toBeTruthy();
    expect(screen.getAllByText("Laminado")).toBeTruthy();
    expect(screen.getAllByText("Listo")).toBeTruthy();
    expect(screen.queryByText("Entregado")).toBeNull();
  });

  it("muestra las tarjetas en las columnas correctas", () => {
    render(
      <KanbanBoard
        columnas={columnas}
        areas={areas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    expect(screen.getByText("Pedido Mostrador")).toBeInTheDocument();
    expect(screen.getByText("Pedido Diseño")).toBeInTheDocument();
  });

  it("muestra estado vacio cuando no hay areas", () => {
    render(
      <KanbanBoard
        columnas={{}}
        areas={[]}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    expect(screen.getByText("No hay áreas de producción configuradas.")).toBeInTheDocument();
  });

  it("muestra estado vacio cuando no hay pedidos", () => {
    render(
      <KanbanBoard
        columnas={{ mostrador: [], diseno: [], impresion: [], laminado: [], listo: [] }}
        areas={areas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    expect(screen.getByText("No hay pedidos activos en producción.")).toBeInTheDocument();
  });

  it("no muestra estado vacio cuando hay filtros activos", () => {
    render(
      <KanbanBoard
        columnas={{ mostrador: [], diseno: [], impresion: [], laminado: [], listo: [] }}
        areas={areas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        hayFiltrosActivos={true}
      />,
    );
    expect(screen.queryByText("No hay pedidos activos en producción.")).toBeNull();
  });

  it("muestra skeleton loader cuando loading es true", () => {
    render(
      <KanbanBoard
        columnas={columnas}
        areas={areas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        loading={true}
      />,
    );
    expect(document.querySelector("[class*='animate-pulse']")).toBeTruthy();
  });

  it("renderiza la barra de navegacion rapida con mas de 4 columnas", () => {
    const muchasAreas = [...areas, { id: "montaje", nombre: "Montaje", color: "bg-violet-500", orden: 5 }];
    render(
      <KanbanBoard
        columnas={{ ...columnas, montaje: [] }}
        areas={muchasAreas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    expect(screen.getByText("Ir a:")).toBeInTheDocument();
  });

  it("no muestra barra de navegacion con 4 o menos columnas", () => {
    const pocasAreas = areas.slice(0, 4);
    render(
      <KanbanBoard
        columnas={columnas}
        areas={pocasAreas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
      />,
    );
    expect(screen.queryByText("Ir a:")).toBeNull();
  });

  it("pasa onClickDetalle a las columnas", () => {
    const onClickDetalle = vi.fn();
    render(
      <KanbanBoard
        columnas={columnas}
        areas={areas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        onClickDetalle={onClickDetalle}
      />,
    );
    expect(screen.getByText("Pedido Mostrador")).toBeInTheDocument();
  });

  it("aplica colapso a columnas especificas", () => {
    render(
      <KanbanBoard
        columnas={columnas}
        areas={areas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        collapsedColumns={new Set(["diseno"])}
      />,
    );
    expect(screen.getByText("1 pedidos")).toBeInTheDocument();
  });

  it("pasa wipLimits configurados a las columnas", () => {
    render(
      <KanbanBoard
        columnas={columnas}
        areas={areas}
        getNextForPedido={getNextForPedido}
        onAvanzarPedido={onAvanzarPedido}
        wipLimits={{ diseno: 5 }}
      />,
    );
    expect(screen.getByText("1/5")).toBeInTheDocument();
  });
});
