import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/lib/supabase/client";
import { queueOrder, syncQueue, getQueueCount } from "./orderQueue";
import { crearPedido } from "@/lib/services/pedidos";

vi.mock("@/lib/services/pedidos", () => ({
  crearPedido: vi.fn(),
}));

vi.mock("./db", () => ({
  enqueuePedido: vi.fn(),
  getPendingPedidos: vi.fn(),
  updatePedidoSyncStatus: vi.fn(),
  removeSyncedPedido: vi.fn(),
}));

import { enqueuePedido, getPendingPedidos, updatePedidoSyncStatus, removeSyncedPedido } from "./db";

const mockDraft = {
  cliente_nombre: "Test", cliente_telefono: "", fecha_entrega: "2026-01-01",
  hora_entrega: "10:00", requiere_correccion: false, lineas: [],
  subtotal: 0, anticipo: 0, total: 0, metodo_pago: "Efectivo" as const,
  ruta: "R1" as const, sucursal_id: "s1", marca_id: "m1",
};

describe("queueOrder", () => {
  it("encola un pedido offline", async () => {
    await queueOrder(mockDraft);
    expect(enqueuePedido).toHaveBeenCalled();
  });
});

describe("syncQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 0 si no hay pendientes", async () => {
    vi.mocked(getPendingPedidos).mockResolvedValue([]);
    const result = await syncQueue("cajero-1");
    expect(result).toEqual({ synced: 0, failed: 0 });
  });

  it("sincroniza pedidos pendientes exitosamente", async () => {
    vi.mocked(getPendingPedidos).mockResolvedValue([
      { id: "off_1", draft: mockDraft, createdAt: Date.now(), syncStatus: "pending" },
      { id: "off_2", draft: mockDraft, createdAt: Date.now(), syncStatus: "pending" },
    ]);
    vi.mocked(crearPedido).mockResolvedValue("PIC-PAL-00001");

    const result = await syncQueue("cajero-1");

    expect(crearPedido).toHaveBeenCalledTimes(2);
    expect(updatePedidoSyncStatus).toHaveBeenCalledWith("off_1", "syncing");
    expect(removeSyncedPedido).toHaveBeenCalledWith("off_1");
    expect(result).toEqual({ synced: 2, failed: 0 });
  });

  it("maneja fallos individuales sin detener", async () => {
    vi.mocked(getPendingPedidos).mockResolvedValue([
      { id: "off_1", draft: mockDraft, createdAt: Date.now(), syncStatus: "pending" },
      { id: "off_2", draft: mockDraft, createdAt: Date.now(), syncStatus: "pending" },
    ]);
    vi.mocked(crearPedido)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce("PIC-PAL-00002");

    const result = await syncQueue("cajero-1");

    expect(updatePedidoSyncStatus).toHaveBeenCalledWith("off_1", "failed", "Network error");
    expect(removeSyncedPedido).toHaveBeenCalledWith("off_2");
    expect(result).toEqual({ synced: 1, failed: 1 });
  });
});

describe("getQueueCount", () => {
  it("retorna cantidad de pendientes", async () => {
    vi.mocked(getPendingPedidos).mockResolvedValue([
      { id: "off_1", draft: {}, createdAt: Date.now(), syncStatus: "pending" },
      { id: "off_2", draft: {}, createdAt: Date.now(), syncStatus: "pending" },
    ]);
    expect(await getQueueCount()).toBe(2);
  });

  it("retorna 0 si no hay pendientes", async () => {
    vi.mocked(getPendingPedidos).mockResolvedValue([]);
    expect(await getQueueCount()).toBe(0);
  });
});
