"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const ROLES = [
  { key: "mostrador", label: "Mostrador" },
  { key: "taller", label: "Taller" },
  { key: "corte", label: "Corte" },
] as const;

function getRoleOverrideCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)role_override=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function RoleSwitcher() {
  const router = useRouter();
  const [roleOverride, setRoleOverride] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setRoleOverride(getRoleOverrideCookie());
  }, []);

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
      const res = await fetch("/api/role-override", {
        method: "DELETE",
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

  const currentRole = ROLES.find((r) => r.key === roleOverride);

  if (currentRole) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
          Viendo: {currentRole.label}
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
      onChange={(e) => {
        const role = e.target.value;
        if (role) handleSwitchRole(role);
      }}
      className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      <option value="" disabled>
        Ver como ▾
      </option>
      {ROLES.map((r) => (
        <option key={r.key} value={r.key}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
