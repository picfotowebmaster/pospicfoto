import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutocompletar } from "./useAutocompletar";

const mockItems = [
  { id: "1", nombre: "Foto 4x6" },
  { id: "2", nombre: "Foto 5x7" },
  { id: "3", nombre: "Foto Grande" },
];

describe("useAutocompletar", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchFn: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchFn = vi.fn().mockResolvedValue(mockItems);
  });

  function mkHook(onSelect = vi.fn()) {
    return renderHook(() =>
      useAutocompletar({
        fetchFn,
        onSelect,
        renderItem: (i: { nombre: string }) => i.nombre,
        minChars: 2,
      })
    );
  }

  it("no busca si el termino es menor a minChars", async () => {
    const { result } = mkHook();

    await act(async () => {
      await result.current.buscar("a");
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.opciones).toEqual([]);
    expect(result.current.abierto).toBe(false);
  });

  it("busca y muestra opciones", async () => {
    const { result } = mkHook();

    await act(async () => {
      await result.current.buscar("Foto");
    });

    expect(fetchFn).toHaveBeenCalledWith("Foto");
    expect(result.current.opciones).toEqual(mockItems);
    expect(result.current.abierto).toBe(true);
  });

  it("selecciona un item y cierra", async () => {
    const onSelect = vi.fn();
    const { result } = mkHook(onSelect);

    await act(async () => {
      await result.current.buscar("Foto");
    });

    act(() => {
      result.current.seleccionar(mockItems[0]);
    });

    expect(result.current.termino).toBe("Foto 4x6");
    expect(result.current.abierto).toBe(false);
    expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it("navega con ArrowDown", async () => {
    const { result } = mkHook();

    await act(async () => {
      await result.current.buscar("Foto");
    });

    act(() => {
      result.current.tecla({ key: "ArrowDown", preventDefault: vi.fn() } as unknown as React.KeyboardEvent);
    });

    expect(result.current.indiceSeleccionado).toBe(0);
  });

  it("navega con ArrowUp desde -1 va al ultimo", async () => {
    const { result } = mkHook();

    await act(async () => {
      await result.current.buscar("Foto");
    });

    act(() => {
      result.current.tecla({ key: "ArrowUp", preventDefault: vi.fn() } as unknown as React.KeyboardEvent);
    });

    expect(result.current.indiceSeleccionado).toBe(mockItems.length - 1);
  });

  it("selecciona con Enter", async () => {
    const onSelect = vi.fn();
    const { result } = mkHook(onSelect);

    await act(async () => {
      await result.current.buscar("Foto");
    });

    act(() => {
      result.current.tecla({ key: "ArrowDown", preventDefault: vi.fn() } as unknown as React.KeyboardEvent);
    });

    await act(async () => {
      result.current.tecla({ key: "Enter", preventDefault: vi.fn() } as unknown as React.KeyboardEvent);
    });

    expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it("cierra con Escape", async () => {
    const { result } = mkHook();

    await act(async () => {
      await result.current.buscar("Foto");
    });
    expect(result.current.abierto).toBe(true);

    act(() => {
      result.current.tecla({ key: "Escape", preventDefault: vi.fn() } as unknown as React.KeyboardEvent);
    });

    expect(result.current.abierto).toBe(false);
  });

  it("no hace nada con teclas si no esta abierto", async () => {
    const { result } = mkHook();

    act(() => {
      result.current.tecla({ key: "ArrowDown", preventDefault: vi.fn() } as unknown as React.KeyboardEvent);
    });

    expect(result.current.indiceSeleccionado).toBe(-1);
  });

  it("cierra al click fuera", () => {
    const { result } = mkHook();

    act(() => {
      result.current.setTermino("Foto");
    });

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(result.current.abierto).toBe(false);
  });
});
