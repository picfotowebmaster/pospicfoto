"use client";

import { useState } from "react";
import { useOffline } from "@/lib/offline/useOffline";

export default function OfflineBanner() {
  const { isOnline } = useOffline();
  const [dismissed, setDismissed] = useState(false);
  const [prevOnline, setPrevOnline] = useState(isOnline);

  // Al volver a estar offline, volver a mostrar el aviso.
  if (isOnline !== prevOnline) {
    setPrevOnline(isOnline);
    if (!isOnline) setDismissed(false);
  }

  if (isOnline || dismissed) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <i className="fas fa-wifi-slash" />
      <span>Sin conexión — los pedidos se guardarán localmente y se sincronizarán al reconectar</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-2 text-white/80 hover:text-white"
        aria-label="Cerrar"
      >
        <i className="fas fa-times" />
      </button>
    </div>
  );
}
