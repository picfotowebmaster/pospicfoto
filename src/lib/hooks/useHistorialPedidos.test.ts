import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useHistorialPedidos } from "./useHistorialPedidos";

vi.mock("@/lib/services/pedidos", () => ({
  listarPedidos: vi.fn(),
}));

import { listarPedidos } from "@/lib/services/pedidos";

describe("useHistorialPedidos", () => {
  it("carga pedidos iniciales", async () => {
    vi.mocked(listarPedidos).mockResolvedValue({
      pedidos: [{ id: "p1", cliente_nombre: "Juan", detalle_pedidos: [] } as any],
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
      pedidos: [{ id: "p2", cliente_nombre: "Pedro", detalle_pedidos: [] } as any],
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
