"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<string, string> = {
  mostrador: "Mostrador",
  diseno: "Diseño",
  impresion: "Impresión",
  laminado: "Laminado",
  montaje: "Montaje",
  books: "Books",
  bastidores: "Bastidores",
  marcos: "Marcos",
  taller: "Taller",
  corte: "Corte",
};

function getRoleOverrideCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)role_override=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function subscribeToCookie() {
  return () => {};
}

function getCookieSnapshot() {
  return getRoleOverrideCookie();
}

function getServerCookieSnapshot() {
  return null;
}

export default function RoleBanner() {
  const router = useRouter();
  const roleOverride = useSyncExternalStore(
    subscribeToCookie,
    getCookieSnapshot,
    getServerCookieSnapshot,
  );
  const [cargando, setCargando] = useState(false);

  async function handleClearOverride() {
    setCargando(true);
    try {
      const res = await fetch("/api/role-override", { method: "DELETE" });
      const data = await res.json();
      if (data.redirectTo) {
        router.push(data.redirectTo);
      }
    } catch {
      // ignore
    } finally {
      setCargando(false);
    }
  }

  if (!roleOverride) return null;

  const label = ROLE_LABELS[roleOverride] || roleOverride;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm text-yellow-800">
          Estás viendo como{" "}
          <span className="font-semibold">{label}</span>
        </p>
        <button
          onClick={handleClearOverride}
          disabled={cargando}
          className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline transition-colors"
        >
          {cargando ? "Cargando..." : "Volver a Admin"}
        </button>
      </div>
    </div>
  );
}
