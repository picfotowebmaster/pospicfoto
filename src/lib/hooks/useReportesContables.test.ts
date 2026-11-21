import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
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

vi.mock("@/lib/services/sucursales", () => ({
  listarSucursales: vi.fn().mockResolvedValue([
    { id: "suc-1", nombre: "Palma", codigo: "PAL" },
    { id: "suc-2", nombre: "Cuba", codigo: "CUB" },
  ]),
  indexarSucursales: (
    sucursales: { id: string; nombre: string }[],
  ) => new Map(sucursales.map((s) => [s.id, s.nombre])),
  nombreSucursal: () => "Palma",
}));

vi.mock("@/lib/services/marcas", () => ({
  listarMarcas: vi.fn().mockResolvedValue([
    { id: "mar-1", nombre: "Picfoto", codigo: "PIC" },
    { id: "mar-2", nombre: "Framex", codigo: "FRX" },
  ]),
  indexarMarcas: (marcas: { id: string; nombre: string }[]) =>
    new Map(marcas.map((m) => [m.id, m.nombre])),
  nombreMarca: () => "Picfoto",
}));

import { obtenerPedidosReporte } from "@/lib/services/reportesContables";
import { listarVendedores } from "@/lib/services/vendedores";
import { listarSucursales } from "@/lib/services/sucursales";
import { listarMarcas } from "@/lib/services/marcas";
import { fechaNegocio } from "@/lib/utils/fechas";

const pedido = {
  id: "p1",
  numero_pedido: "PIC-1",
  cliente_nombre: "Cliente",
  cliente_rfc: null,
  cajero_id: "v1",
  sucursal_id: "suc-1",
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
      useReportesContables({
        sucursalFijo: "suc-1",
        marcaFijo: "mar-1",
        restringido: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(obtenerPedidosReporte).toHaveBeenCalledWith(
      expect.objectContaining({ desde: expect.any(String) }),
      "suc-1",
      "mar-1",
    );
    expect(listarVendedores).toHaveBeenCalledWith("suc-1", "mar-1");
    expect(listarSucursales).not.toHaveBeenCalled();
    expect(listarMarcas).toHaveBeenCalled();
    expect(result.current.reporte.totalPedidos).toBe(2);
    expect(result.current.reporte.movimientos).toHaveLength(2);
    expect(result.current.sucursalEfectiva).toBe("suc-1");
    expect(result.current.marcaEfectiva).toBe("mar-1");
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
      undefined,
    );
    expect(listarSucursales).toHaveBeenCalled();
    expect(listarMarcas).toHaveBeenCalled();
    expect(result.current.reporte.totalPedidos).toBe(1);
    expect(result.current.sucursales).toHaveLength(2);
    expect(result.current.marcas).toHaveLength(2);
  });

  it("permite seleccionar una sucursal cuando el rol ve todo", async () => {
    vi.mocked(obtenerPedidosReporte).mockResolvedValue([pedido]);

    const { result } = renderHook(() =>
      useReportesContables({ restringido: false }),
    );

    await waitFor(() => {
      expect(result.current.sucursales).toHaveLength(2);
    });

    act(() => {
      result.current.setSucursalSeleccionada("suc-2");
    });

    await waitFor(() => {
      expect(result.current.sucursalEfectiva).toBe("suc-2");
      expect(obtenerPedidosReporte).toHaveBeenLastCalledWith(
        expect.objectContaining({ desde: expect.any(String) }),
        "suc-2",
        undefined,
      );
      expect(listarVendedores).toHaveBeenLastCalledWith("suc-2", undefined);
    });
  });

  it("permite seleccionar una marca cuando el rol ve todo", async () => {
    vi.mocked(obtenerPedidosReporte).mockResolvedValue([pedido]);

    const { result } = renderHook(() =>
      useReportesContables({ restringido: false }),
    );

    await waitFor(() => {
      expect(result.current.marcas).toHaveLength(2);
    });

    act(() => {
      result.current.setMarcaSeleccionada("mar-2");
    });

    await waitFor(() => {
      expect(result.current.marcaEfectiva).toBe("mar-2");
      expect(obtenerPedidosReporte).toHaveBeenLastCalledWith(
        expect.objectContaining({ desde: expect.any(String) }),
        undefined,
        "mar-2",
      );
    });
  });

  it("ignora el filtro de vendedor cuando el usuario está restringido", async () => {
    vi.mocked(obtenerPedidosReporte).mockResolvedValue([
      pedido,
      { ...pedido, id: "p2", numero_pedido: "PIC-2", cajero_id: "v2" },
    ]);

    const { result } = renderHook(() =>
      useReportesContables({
        sucursalFijo: "suc-1",
        marcaFijo: "mar-1",
        restringido: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.reporte.totalPedidos).toBe(2);
    });

    act(() => {
      result.current.setVendedorId("v2");
    });

    await waitFor(() => {
      expect(result.current.vendedorId).toBe("v2");
      expect(result.current.reporte.totalPedidos).toBe(2);
      expect(result.current.reporte.porVendedor).toHaveLength(2);
    });
  });

  it("no consulta si el usuario restringido no tiene marca", async () => {
    vi.mocked(obtenerPedidosReporte).mockClear();

    const { result } = renderHook(() =>
      useReportesContables({ sucursalFijo: "suc-1", restringido: true }),
    );

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(obtenerPedidosReporte).not.toHaveBeenCalled();
    expect(result.current.sinMarca).toBe(true);
    expect(result.current.error).toMatch(/marca asignada/i);
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
