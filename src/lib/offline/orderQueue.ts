import { enqueuePedido, getPendingPedidos, updatePedidoSyncStatus, removeSyncedPedido } from "./db";
import { crearPedido } from "@/lib/services/pedidos";
import type { PedidoDraft } from "@/lib/supabase/types";

let syncing = false;

export async function queueOrder(draft: PedidoDraft): Promise<void> {
  await enqueuePedido(draft as unknown as Record<string, unknown>);
}

export async function syncQueue(cajeroId: string): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingPedidos();
    for (const item of pending) {
      try {
        await updatePedidoSyncStatus(item.id, "syncing");
        await crearPedido(item.draft as unknown as PedidoDraft, cajeroId);
        await removeSyncedPedido(item.id);
        synced++;
      } catch (err) {
        await updatePedidoSyncStatus(
          item.id,
          "failed",
          err instanceof Error ? err.message : "Unknown error",
        );
        failed++;
      }
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}

export async function getQueueCount(): Promise<number> {
  const pending = await getPendingPedidos();
  return pending.length;
}
