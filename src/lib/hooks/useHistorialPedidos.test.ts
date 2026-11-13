import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useHistorialPedidos } from "./useHistorialPedidos";
import type { Pedido } from "@/lib/supabase/types";

vi.mock("@/lib/services/pedidos", () => ({
  listarPedidos: vi.fn(),
  contarPedidos: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/services/vendedores", () => ({
  listarVendedores: vi.fn().mockResolvedValue([]),
}));

import { listarPedidos, contarPedidos } from "@/lib/services/pedidos";
import { listarVendedores } from "@/lib/services/vendedores";

describe("useHistorialPedidos", () => {
  it("carga pedidos iniciales", async () => {
    vi.mocked(listarPedidos).mockResolvedValue({
      pedidos: [{ id: "p1", cliente_nombre: "Juan", detalle_pedidos: [] } as unknown as Pedido],
      hasMore: false,
    });

    const { result } = renderHook(() => useHistorialPedidos());

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.pedidos).toHaveLength(1);
    expect(result.current.pedidos[0].cliente_nombre).toBe("Juan");
    expect(result.current.hasMore).toBe(false);
  });

  it("aplica la sucursal fija a pedidos, conteo y vendedores", async () => {
    vi.mocked(listarPedidos).mockResolvedValue({ pedidos: [], hasMore: false });

    const { result } = renderHook(() =>
      useHistorialPedidos({ sucursalFijo: "suc-1" }),
    );

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(listarPedidos).toHaveBeenCalledWith(
      expect.objectContaining({ sucursalId: "suc-1" }),
    );
    expect(contarPedidos).toHaveBeenCalledWith(
      expect.objectContaining({ sucursalId: "suc-1" }),
    );
    expect(listarVendedores).toHaveBeenCalledWith("suc-1");
  });

  it("no consulta si está deshabilitado", async () => {
    vi.mocked(listarPedidos).mockClear();

    renderHook(() => useHistorialPedidos({ habilitado: false }));

    await Promise.resolve();

    expect(listarPedidos).not.toHaveBeenCalled();
  });

  it("maneja error de carga", async () => {
    vi.mocked(listarPedidos).mockRejectedValue(new Error("DB error"));

    const { result } = renderHook(() => useHistorialPedidos());

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.pedidos).toEqual([]);
  });

  it("cambia de pagina", async () => {
    vi.mocked(listarPedidos).mockResolvedValue({
      pedidos: [{ id: "p2", cliente_nombre: "Pedro", detalle_pedidos: [] } as unknown as Pedido],
      hasMore: true,
    });

    const { result } = renderHook(() => useHistorialPedidos());

    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.setPagina(2);
    });

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(listarPedidos).toHaveBeenCalled();
  });

  it("actualiza filtros y reinicia pagina", async () => {
    vi.mocked(listarPedidos).mockResolvedValue({
      pedidos: [],
      hasMore: false,
    });

    const { result } = renderHook(() => useHistorialPedidos());

    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.actualizarFiltros({ estado: "pendiente" });
    });

    expect(result.current.pagina).toBe(1);
    expect(listarPedidos).toHaveBeenCalled();
  });

  it("recargar re-ejecuta la query", async () => {
    vi.mocked(listarPedidos).mockResolvedValue({
      pedidos: [],
      hasMore: false,
    });

    const { result } = renderHook(() => useHistorialPedidos());

    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.recargar();
    });

    expect(listarPedidos).toHaveBeenCalled();
  });
});
