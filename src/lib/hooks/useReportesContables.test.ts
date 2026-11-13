import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useReportesContables } from "./useReportesContables";

vi.mock("@/lib/services/reportesContables", () => ({
  obtenerPedidosReporte: vi.fn(),
}));

vi.mock("@/lib/services/vendedores", () => ({
  listarVendedores: vi.fn().mockResolvedValue([
    {
      id: "v1",
      nombre: "Jesús",
      email: "jesus@picfoto.mx",
      rol: "mostrador",
    },
    { id: "v2", nombre: "Ana", email: "ana@picfoto.mx", rol: "mostrador" },
  ]),
  indexarVendedores: (
    vendedores: { id: string; nombre: string; email?: string | null }[],
  ) =>
    new Map(
      vendedores.map((v) => [
        v.id,
        v.email ? `${v.nombre} (${v.email})` : v.nombre,
      ]),
    ),
  vendedoresParaFiltro: (vendedores: unknown[]) => vendedores,
}));

import { obtenerPedidosReporte } from "@/lib/services/reportesContables";
import { listarVendedores } from "@/lib/services/vendedores";
import { fechaNegocio } from "@/lib/utils/fechas";

const pedido = {
  id: "p1",
  numero_pedido: "PIC-1",
  cliente_nombre: "Cliente",
  cliente_rfc: null,
  cajero_id: "v1",
  fecha_recepcion: fechaNegocio(),
  estado: "pendiente",
  subtotal: 100,
  anticipo: 50,
  total: 100,
  metodo_pago: "Efectivo",
  saldo_cobrado: false,
  saldo_metodo_pago: null,
  saldo_cobrado_en: null,
  saldo_cobrado_por: null,
  factura_folio: null,
  factura_uuid: null,
  factura_estado: null,
  factura_fecha: null,
};

describe("useReportesContables por sucursal", () => {
  it("consulta pedidos y vendedores de la sucursal fija", async () => {
    vi.mocked(obtenerPedidosReporte).mockResolvedValue([
      pedido,
      {
        ...pedido,
        id: "p2",
        numero_pedido: "PIC-2",
        cajero_id: "v2",
      },
    ]);

    const { result } = renderHook(() =>
      useReportesContables({ sucursalFijo: "suc-1", restringido: true }),
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(obtenerPedidosReporte).toHaveBeenCalledWith(
      expect.objectContaining({ desde: expect.any(String) }),
      "suc-1",
    );
    expect(listarVendedores).toHaveBeenCalledWith("suc-1");
    expect(result.current.reporte.totalPedidos).toBe(2);
    expect(result.current.reporte.movimientos).toHaveLength(2);
  });

  it("no filtra por sucursal cuando el rol ve todo", async () => {
    vi.mocked(obtenerPedidosReporte).mockResolvedValue([pedido]);

    const { result } = renderHook(() =>
      useReportesContables({ restringido: false }),
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(obtenerPedidosReporte).toHaveBeenCalledWith(
      expect.objectContaining({ desde: expect.any(String) }),
      undefined,
    );
    expect(result.current.reporte.totalPedidos).toBe(1);
  });

  it("no consulta si el usuario restringido no tiene sucursal", async () => {
    vi.mocked(obtenerPedidosReporte).mockClear();

    const { result } = renderHook(() =>
      useReportesContables({ restringido: true }),
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(obtenerPedidosReporte).not.toHaveBeenCalled();
    expect(result.current.sinSucursal).toBe(true);
    expect(result.current.error).toMatch(/sucursal asignada/i);
  });
});
