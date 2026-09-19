import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePedidoActual } from "./usePedidoActual";
import type { LineaPedidoDraft } from "@/lib/supabase/types";

const helperLinea = (overrides: Partial<LineaPedidoDraft> = {}): Omit<LineaPedidoDraft, "id"> => ({
  producto_nombre: "Foto",
  cantidad: 1,
  precio_unitario: 10,
  atributos: {},
  ruta: "R1",
  ...overrides,
});

vi.mock("@/lib/offline/db", () => ({
  savePedidoDraft: vi.fn().mockResolvedValue(undefined),
  getPedidoDraft: vi.fn().mockResolvedValue(null),
  clearPedidoDraft: vi.fn().mockResolvedValue(undefined),
}));

import { savePedidoDraft, getPedidoDraft, clearPedidoDraft } from "@/lib/offline/db";

describe("usePedidoActual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPedidoDraft).mockResolvedValue(null);
  });

  it("inicia con valores por defecto", () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    expect(result.current.cliente.nombre).toBe("");
    expect(result.current.cliente.telefono).toBe("");
    expect(result.current.lineas).toEqual([]);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.anticipo).toBe(0);
    expect(result.current.total).toBe(0);
    expect(result.current.metodoPago).toBe("Efectivo");
    expect(result.current.rutaDefault).toBe("R1");
    expect(result.current.marcaId).toBe("");
    expect(result.current.valido).toBe(false);
  });

  it("restaura draft si existe", async () => {
    vi.mocked(getPedidoDraft).mockResolvedValue({
      cliente: { nombre: "Carlos", telefono: "55", fechaEntrega: "2026-01-01", horaEntrega: "10:00", requiereCorreccion: false },
      lineas: [{ id: "l1", producto_nombre: "Foto", cantidad: 1, precio_unitario: 10, atributos: {}, ruta: "R2" }],
      porcentajeAnticipo: 100,
      metodoPago: "Tarjeta",
      ruta: "R2",
      marcaId: "m2",
    });

    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.restoreDraft();
    });

    await waitFor(() => {
      expect(result.current.draftRestored).toBe(true);
    });

    expect(result.current.cliente.nombre).toBe("Carlos");
    expect(result.current.metodoPago).toBe("Tarjeta");
    expect(result.current.rutaDefault).toBe("R2");
    expect(result.current.marcaId).toBe("m2");
    expect(result.current.porcentajeAnticipo).toBe(100);
  });

  it("agrega una linea con id generado", () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.agregarLinea(helperLinea({ producto_nombre: "Foto 4x6", cantidad: 2, precio_unitario: 50 }));
    });

    expect(result.current.lineas).toHaveLength(1);
    expect(result.current.lineas[0].producto_nombre).toBe("Foto 4x6");
    expect(result.current.lineas[0].id).toBeTruthy();
  });

  it("elimina una linea por id", () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.agregarLinea(helperLinea({ producto_nombre: "A" }));
    });
    const lineId = result.current.lineas[0].id;

    act(() => {
      result.current.eliminarLinea(lineId);
    });
    expect(result.current.lineas).toHaveLength(0);
  });

  it("actualiza una linea existente", () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.agregarLinea(helperLinea({ producto_nombre: "A" }));
    });
    const lineId = result.current.lineas[0].id;

    act(() => {
      result.current.actualizarLinea(lineId, { cantidad: 5, precio_unitario: 20 });
    });

    expect(result.current.lineas[0].cantidad).toBe(5);
    expect(result.current.lineas[0].precio_unitario).toBe(20);
  });

  it("calcula subtotal correctamente", () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.agregarLinea(helperLinea({ producto_nombre: "A", cantidad: 2, precio_unitario: 100 }));
      result.current.agregarLinea(helperLinea({ producto_nombre: "B", cantidad: 3, precio_unitario: 50 }));
    });

    expect(result.current.subtotal).toBe(350);
    expect(result.current.total).toBe(350);
  });

  it("calcula anticipo segun porcentaje", async () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.setPorcentajeAnticipo(70);
      result.current.agregarLinea(helperLinea({ producto_nombre: "A", precio_unitario: 1000 }));
    });

    expect(result.current.anticipo).toBe(700);
  });

  it("valida que el pedido este completo", () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    expect(result.current.valido).toBe(false);

    act(() => {
      result.current.setCliente({ ...result.current.cliente, nombre: "Juan", fechaEntrega: "2026-01-01", horaEntrega: "10:00" });
      result.current.setMarcaId("m1");
      result.current.agregarLinea(helperLinea({ producto_nombre: "Foto" }));
    });

    expect(result.current.valido).toBe(true);
  });

  it("valido es false si una linea tiene nombre vacio", () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.setCliente({ ...result.current.cliente, nombre: "Juan", fechaEntrega: "2026-01-01", horaEntrega: "10:00" });
      result.current.setMarcaId("m1");
      result.current.agregarLinea(helperLinea({ producto_nombre: "" }));
    });

    expect(result.current.valido).toBe(false);
  });

  it("valido es false con cantidad <= 0", () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.setCliente({ ...result.current.cliente, nombre: "Juan", fechaEntrega: "2026-01-01", horaEntrega: "10:00" });
      result.current.setMarcaId("m1");
      result.current.agregarLinea(helperLinea({ producto_nombre: "Foto", cantidad: 0 }));
    });

    expect(result.current.valido).toBe(false);
  });

  it("limpia todo y borra el draft", async () => {
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.setCliente({ ...result.current.cliente, nombre: "Juan", fechaEntrega: "2026-01-01", horaEntrega: "10:00" });
      result.current.setMarcaId("m1");
      result.current.agregarLinea(helperLinea({ producto_nombre: "Foto" }));
    });

    act(() => {
      result.current.limpiar();
    });

    expect(result.current.cliente.nombre).toBe("");
    expect(result.current.lineas).toEqual([]);
    expect(result.current.metodoPago).toBe("Efectivo");
    expect(result.current.rutaDefault).toBe("R1");
    expect(clearPedidoDraft).toHaveBeenCalled();
  });

  it("auto-guarda el draft", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePedidoActual("suc-1"));

    act(() => {
      result.current.setCliente({ ...result.current.cliente, nombre: "Carlos" });
    });

    expect(savePedidoDraft).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    await vi.runAllTimersAsync();

    expect(savePedidoDraft).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
