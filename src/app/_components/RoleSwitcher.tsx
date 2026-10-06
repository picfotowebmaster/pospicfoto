"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";

const ROLES_VER_COMO = [
  { key: "mostrador", label: "Mostrador" },
  { key: "diseno", label: "Diseño" },
  { key: "impresion", label: "Impresión" },
  { key: "laminado", label: "Laminado" },
  { key: "montaje", label: "Montaje" },
  { key: "books", label: "Books" },
  { key: "bastidores", label: "Bastidores" },
  { key: "marcos", label: "Marcos" },
  { key: "taller", label: "Taller" },
  { key: "corte", label: "Corte" },
  { key: "contador", label: "Contador" },
] as const;

const MODULOS = [
  { path: "/contabilidad/pedidos", label: "Contabilidad" },
  { path: "/admin", label: "Admin" },
  { path: "/produccion/kanban", label: "Producción Kanban" },
  { path: "/mostrador", label: "Mostrador" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  ...Object.fromEntries(ROLES_VER_COMO.map((r) => [r.key, r.label])),
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

export default function RoleSwitcher() {
  const router = useRouter();
  const { profile } = useAuth();
  const roleOverride = useSyncExternalStore(
    subscribeToCookie,
    getCookieSnapshot,
    getServerCookieSnapshot,
  );
  const [cargando, setCargando] = useState(false);

  async function handleSwitchRole(role: string) {
    setCargando(true);
    try {
      const res = await fetch("/api/role-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
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

  function handleChange(valor: string) {
    if (!valor) return;
    if (valor.startsWith("mod:")) {
      router.push(valor.slice(4));
      return;
    }
    handleSwitchRole(valor);
  }

  const esAdmin = profile?.rol === "admin" || profile?.rol === "superadmin";
  const currentRole =
    roleOverride && ROLE_LABELS[roleOverride] ? roleOverride : null;

  // Solo visible para Admin / Super Admin
  if (!esAdmin) return null;

  if (currentRole) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 font-medium whitespace-nowrap">
          Viendo: {ROLE_LABELS[currentRole]}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearOverride}
          disabled={cargando}
          className="text-xs"
        >
          Volver a Admin
        </Button>
      </div>
    );
  }

  return (
    <select
      value=""
      disabled={cargando}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Cambiar rol"
      className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      <option value="" disabled>
        Cambiar rol ▾
      </option>
      <optgroup label="Ver como">
        {ROLES_VER_COMO.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Módulos">
        {MODULOS.map((m) => (
          <option key={m.path} value={`mod:${m.path}`}>
            {m.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
