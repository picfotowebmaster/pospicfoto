import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportesContables } from "./ReportesContables";

const mockUseReportes = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

vi.mock("@/lib/hooks/useReportesContables", () => ({
  useReportesContables: mockUseReportes,
}));

vi.mock("@/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Tema</button>,
}));

vi.mock("@/components/ui/Logo", () => ({
  Logo: () => <span />,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="grafica" />,
}));

function reporteVacio(overrides = {}) {
  return {
    periodo: "mes",
    setPeriodo: vi.fn(),
    desdeCustom: "",
    setDesdeCustom: vi.fn(),
    hastaCustom: "",
    setHastaCustom: vi.fn(),
    metodoPago: "",
    setMetodoPago: vi.fn(),
    vendedorId: "",
    setVendedorId: vi.fn(),
    vendedores: [],
    rango: { desde: "2026-11-01", hasta: "2026-11-30" },
    rangoValido: true,
    reporte: {
      totalVendido: 999,
      totalCobrado: 888,
      saldoPendiente: 111,
      totalPedidos: 7,
      ticketPromedio: 142.71,
      porDia: [],
      movimientos: [],
      porVendedor: [],
      cobradoPorMetodo: [],
    },
    cargando: false,
    error: null,
    recargar: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportesContables", () => {
  it("muestra el reporte completo de la sucursal a mostrador", () => {
    const base = reporteVacio();
    base.reporte = {
      ...base.reporte,
      movimientos: [
        {
          pedidoId: "p1",
          numeroPedido: "PIC-CUB-00092",
          clienteNombre: "Baldemar Menchaca",
          clienteRfc: null,
          vendedorId: "u1",
          vendedorNombre: "Jesus",
          cobradoPorId: "u1",
          cobradoPorNombre: "Jesus",
          fechaVenta: "2026-11-12",
          fechaCobro: "2026-11-12",
          tipo: "Anticipo",
          metodoPago: "Efectivo",
          importe: 126,
          subtotal: 155.17,
          iva: 24.83,
          total: 180,
          estado: "pendiente",
          facturaFolio: null,
          facturaUuid: null,
          facturaEstado: null,
        },
      ],
    } as unknown as typeof base.reporte;
    mockUseReportes.mockReturnValue(base);

    render(
      <ReportesContables
        rol="mostrador"
        puedeVerTodo={false}
        sucursalId="suc-1"
        sucursalNombre="Palma"
      />,
    );

    expect(screen.getByText("Reportes contables")).toBeInTheDocument();
    expect(screen.getByText("Vendido")).toBeInTheDocument();
    expect(screen.getByText("$999.00")).toBeInTheDocument();
    expect(screen.getByText("$888.00")).toBeInTheDocument();
    expect(screen.getByText("Ventas por vendedor")).toBeInTheDocument();
    expect(screen.getByText("Movimientos del periodo")).toBeInTheDocument();
    expect(screen.getByText("PIC-CUB-00092")).toBeInTheDocument();
    expect(screen.getByText("$126.00")).toBeInTheDocument();
    expect(screen.getByText(/Sucursal: Palma/i)).toBeInTheDocument();
    expect(screen.getByText(/Descargar movimientos CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Descargar resumen CSV/i)).toBeInTheDocument();
    expect(screen.queryByText("Mis ventas")).not.toBeInTheDocument();
  });

  it("muestra tarjetas y movimientos a admin y contador", () => {
    mockUseReportes.mockReturnValue(reporteVacio());

    render(
      <ReportesContables
        rol="admin"
        puedeVerTodo
        sucursalId={null}
        sucursalNombre={null}
      />,
    );

    expect(screen.getByText("Reportes contables")).toBeInTheDocument();
    expect(screen.getByText("Vendido")).toBeInTheDocument();
    expect(screen.getByText("$999.00")).toBeInTheDocument();
    expect(screen.getByText("$888.00")).toBeInTheDocument();
  });
});
