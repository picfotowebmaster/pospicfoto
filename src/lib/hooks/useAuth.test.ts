import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase/client";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as never);
  });

  it("inicia con session null", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("carga session existente", async () => {
    const mockSession = { user: { id: "user-1" } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as never);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "user-1", rol: "mostrador", nombre: "Juan" }, error: null }),
    } as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });
  });

  it("signIn llama a supabase", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: "1" }, session: null },
      error: null,
    } as ReturnType<typeof supabase.auth.signInWithPassword>);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    const { error } = await result.current.signIn("user@test.com", "pass");
    expect(error).toBeNull();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: "user@test.com", password: "pass" });
  });

  it("signIn retorna error si falla", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid credentials"),
    } as never);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    const { error } = await result.current.signIn("bad@test.com", "wrong");
    expect(error).toBeTruthy();
  });

  it("resetPasswordForEmail llama a supabase", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    } as never);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    const { error } = await result.current.resetPasswordForEmail("user@test.com");
    expect(error).toBeNull();
  });
});
