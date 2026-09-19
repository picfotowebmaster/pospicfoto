import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOffline } from "@/lib/offline/useOffline";

describe("useOffline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia como online", () => {
    const { result } = renderHook(() => useOffline());
    expect(result.current.isOnline).toBe(true);
  });

  it("cambia a offline en evento offline", () => {
    const { result } = renderHook(() => useOffline());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it("cambia a online en evento online", () => {
    const { result } = renderHook(() => useOffline());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it("checkNow verifica el estado actual", () => {
    const { result } = renderHook(() => useOffline());

    act(() => {
      result.current.checkNow();
    });

    expect(result.current.isOnline).toBe(true);
  });
});
