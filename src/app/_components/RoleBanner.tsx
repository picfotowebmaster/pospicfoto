"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRoleOverride } from "@/lib/hooks/useRoleOverride";
import {
  ROLE_LABELS,
  rolesSwitchDisponibles,
  etiquetaVolver,
} from "@/lib/utils/roles";

export default function RoleBanner() {
  const { profile } = useAuth();
  const roleOverride = useRoleOverride();
  const [cargando, setCargando] = useState(false);

  async function handleClearOverride() {
    setCargando(true);
    try {
      const res = await fetch("/api/role-override", { method: "DELETE" });
      const data = await res.json();
      if (data.redirectTo) {
        window.location.assign(data.redirectTo);
      }
    } catch {
      // ignore
    } finally {
      setCargando(false);
    }
  }

  const permitidos = rolesSwitchDisponibles(profile?.rol);
  if (!roleOverride || !permitidos.includes(roleOverride)) return null;

  const label = ROLE_LABELS[roleOverride] ?? roleOverride;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm text-yellow-800">
          Estás viendo como{" "}
          <span className="font-semibold">{label}</span>
        </p>
        <button
          type="button"
          onClick={handleClearOverride}
          disabled={cargando}
          className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline transition-colors"
        >
          {cargando ? "Cargando..." : etiquetaVolver(profile?.rol)}
        </button>
      </div>
    </div>
  );
}
