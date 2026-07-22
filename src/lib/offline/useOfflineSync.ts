"use client";

import { useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { syncQueue } from "./orderQueue";

interface UseOfflineSyncOptions {
  cajeroId: string | undefined;
  isOnline: boolean;
}

export function useOfflineSync({ cajeroId, isOnline }: UseOfflineSyncOptions) {
  const { showSuccess, showError } = useToast();

  const sync = useCallback(async () => {
    if (!cajeroId || !isOnline) return;
    try {
      const result = await syncQueue(cajeroId);
      if (result.synced > 0) {
        showSuccess(`${result.synced} pedido(s) sincronizado(s) con el servidor`);
      }
      if (result.failed > 0) {
        showError(`${result.failed} pedido(s) fallaron al sincronizar`);
      }
    } catch {
      // silencioso
    }
  }, [cajeroId, isOnline, showSuccess, showError]);

  useEffect(() => {
    if (isOnline && cajeroId) {
      sync();
    }
  }, [isOnline, cajeroId, sync]);

  useEffect(() => {
    function handleOnline() {
      sync();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [sync]);

  return { sync };
}
