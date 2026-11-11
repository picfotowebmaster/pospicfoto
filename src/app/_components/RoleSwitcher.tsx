"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRoleOverride } from "@/lib/hooks/useRoleOverride";
import { facturacionHabilitada } from "@/lib/config/features";
import {
  ROLE_LABELS,
  ROLES_SWITCH_ADMIN,
  rolesSwitchDisponibles,
  etiquetaVolver,
  esAdminRol,
  puedeVerRoleSwitcher,
} from "@/lib/utils/roles";

const MODULOS = [
  facturacionHabilitada()
    ? { path: "/contabilidad/pedidos", label: "Contabilidad" }
    : { path: "/contabilidad/reportes", label: "Reportes contables" },
  { path: "/admin", label: "Admin" },
  { path: "/produccion/kanban", label: "Producción Kanban" },
  { path: "/mostrador", label: "Mostrador" },
];

export default function RoleSwitcher() {
  const router = useRouter();
  const { profile } = useAuth();
  const roleOverride = useRoleOverride();
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
        window.location.assign(data.redirectTo);
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
        window.location.assign(data.redirectTo);
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

  const esAdmin = esAdminRol(profile?.rol);
  const puedeVer = puedeVerRoleSwitcher(profile?.rol);
  const permitidos = rolesSwitchDisponibles(profile?.rol);
  const opciones = ROLES_SWITCH_ADMIN.filter((rol) =>
    permitidos.includes(rol),
  );
  const currentRole =
    roleOverride && permitidos.includes(roleOverride) ? roleOverride : null;

  if (!puedeVer) return null;

  if (currentRole) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 font-medium whitespace-nowrap">
          Viendo: {ROLE_LABELS[currentRole] ?? currentRole}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearOverride}
          disabled={cargando}
          className="text-xs"
        >
          {etiquetaVolver(profile?.rol)}
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
        {opciones.map((rol) => (
          <option key={rol} value={rol}>
            {ROLE_LABELS[rol] ?? rol}
          </option>
        ))}
      </optgroup>
      {esAdmin && (
        <optgroup label="Módulos">
          {MODULOS.map((m) => (
            <option key={m.path} value={`mod:${m.path}`}>
              {m.label}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
