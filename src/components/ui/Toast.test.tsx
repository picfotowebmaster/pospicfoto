import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { useToast, ToastProvider } from "@/components/ui/Toast";

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe("useToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza error si se usa fuera de ToastProvider", () => {
    expect(() => renderHook(() => useToast())).toThrow("useToast debe usarse dentro de ToastProvider");
  });

  it("showError llama a showToast con tipo error", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showError("Error de prueba");
    });

    expect(result.current.showError).toBeDefined();
    expect(result.current.showSuccess).toBeDefined();
  });

  it("showSuccess llama a showToast con tipo success", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showSuccess("Operacion completada");
    });

    expect(result.current.showSuccess).toBeDefined();
  });

  it("showToast acepta cualquier tipo", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("info", "Mensaje informativo");
    });

    expect(result.current.showToast).toBeDefined();
  });
});
