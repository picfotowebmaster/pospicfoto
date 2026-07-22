"use client";

import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
      setDismissed(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline || dismissed) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <i className="fas fa-wifi-slash" />
      <span>Sin conexión — los pedidos se guardarán localmente y se sincronizarán al reconectar</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 text-white/80 hover:text-white"
        aria-label="Cerrar"
      >
        <i className="fas fa-times" />
      </button>
    </div>
  );
}
