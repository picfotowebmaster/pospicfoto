import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase/client";
import { obtenerCobradoEfectivoCaja } from "./caja";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("obtenerCobradoEfectivoCaja", () => {
  it("consulta el RPC con rango y sucursal y normaliza el total", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: "123.45",
      error: null,
    } as never);

    const total = await obtenerCobradoEfectivoCaja(
      { desde: "2026-11-01", hasta: "2026-11-30" },
      "s1",
    );

    expect(supabase.rpc).toHaveBeenCalledWith("cobrado_efectivo_caja", {
      p_desde: "2026-11-01",
      p_hasta: "2026-11-30",
      p_sucursal_id: "s1",
    });
    expect(total).toBe(123.45);
  });

  it("propaga el error del RPC", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new Error("boom"),
    } as never);

    await expect(
      obtenerCobradoEfectivoCaja(
        { desde: "2026-11-01", hasta: "2026-11-30" },
        null,
      ),
    ).rejects.toThrow("boom");
  });
});
