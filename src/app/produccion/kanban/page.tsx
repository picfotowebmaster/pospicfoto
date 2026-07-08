"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { usePedidosKanban } from "@/lib/hooks/usePedidosKanban";
import { fetchProductionAreas, fetchUserRole } from "@/lib/services/workflow";
import { AREAS_PRODUCCION_DATA } from "@/lib/utils/constantes";
import { KanbanBoard } from "../_components/KanbanBoard";
import { KanbanToast, createToast, type ToastItem } from "../_components/KanbanToast";
import { Button } from "@/components/ui/Button";
import type { Pedido } from "@/lib/supabase/types";

const ROLES_DEPARTAMENTO = [
  "diseno", "impresion", "laminado", "montaje",
  "books", "bastidores", "marcos", "taller", "corte",
];

const ROL_PERMITIDOS_CANCELAR = [
  "mostrador", "taller", "corte", "admin", "superadmin",
];

function getDepartamentoFromRol(rol: string | null): string | undefined {
  if (!rol) return undefined;
  if (["admin", "superadmin"].includes(rol)) return undefined;
  if (ROLES_DEPARTAMENTO.includes(rol)) return rol;
  return undefined;
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [880, 1100].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    });
  } catch {
    /* navegador bloquea audio, silencioso */
  }
}

export default function KanbanPage() {
  const { session, signOut } = useAuth();
  const { showError } = useToast();
  const [rol, setRol] = useState<string | null>(null);
  const [rolCargando, setRolCargando] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setRolCargando(false);
      return;
    }
    fetchUserRole(session.user.id)
      .then((r) => {
        setRol(r);
        setRolCargando(false);
      })
      .catch(() => {
        setRolCargando(false);
        showError("Error al verificar permisos de usuario.");
      });
  }, [session?.user?.id]);

  const areaFiltro = getDepartamentoFromRol(rol);

  const [areas, setAreas] = useState<{ id: string; nombre: string; color: string; orden: number }[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCorreccion, setFiltroCorreccion] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [muted, setMuted] = useState(false);

  const handleRemoveToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleNuevoPedido = useCallback(
    (pedido: Pedido) => {
      setToasts((prev) => [createToast(pedido), ...prev].slice(0, 5));
      if (!muted) playChime();
    },
    [muted],
  );

  const { columnas, cargando, getNextForPedido, avanzarPedido, cancelarPedido, recargar } =
    usePedidosKanban(areaFiltro, handleNuevoPedido);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchProductionAreas()
      .then(setAreas)
      .catch((err: unknown) => {
        const e = err as { code?: string; message?: string; details?: string };
        console.error("PostgREST production_areas:", e.code, e.message, e.details);
        showError("Error al cargar áreas de producción. Usando configuración por defecto.");
        setAreas(AREAS_PRODUCCION_DATA);
      });
  }, [session?.user?.id]);

  const areaNombre = areas.find((a) => a.id === areaFiltro)?.nombre;

  const columnasFiltradas = useMemo(() => {
    if (!busqueda && !filtroCorreccion) return columnas;

    const filtradas: Record<string, typeof columnas[string]> = {};
    for (const [area, pedidos] of Object.entries(columnas)) {
      const filtrados = pedidos.filter((p) => {
        if (busqueda && !p.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
        if (filtroCorreccion === "si" && !p.requiere_correccion) return false;
        if (filtroCorreccion === "no" && p.requiere_correccion) return false;
        return true;
      });
      if (filtrados.length > 0) {
        filtradas[area] = filtrados;
      }
    }
    return filtradas;
  }, [columnas, busqueda, filtroCorreccion]);

  if (rolCargando) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            PIC PHOTO - {areaNombre || "PRODUCCIÓN"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pipeline de Producción</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setMuted((m) => !m)}
            className="text-lg cursor-pointer leading-none select-none text-gray-500 dark:text-gray-400"
            title={muted ? "Activar sonido" : "Silenciar"}
          >
            <i className={`fas ${muted ? "fa-volume-mute" : "fa-volume-up"}`} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-300">{session?.user.email}</span>
          <Button variant="ghost" size="sm" onClick={recargar}>
            Actualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Salir
          </Button>
        </div>
      </header>

      <div className="max-w-full mx-auto p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Cliente
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre..."
                className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Corrección
              </label>
              <select
                value={filtroCorreccion}
                onChange={(e) => setFiltroCorreccion(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                <option value="si">Requiere corrección</option>
                <option value="no">Sin corrección</option>
              </select>
            </div>

            {(busqueda || filtroCorreccion) && (
              <div className="pb-0.5">
                <button
                  onClick={() => {
                    setBusqueda("");
                    setFiltroCorreccion("");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium cursor-pointer"
                >
                  Limpiar filtros
                </button>
              </div>
            )}

            <div className="flex-1" />

            <div className="text-xs text-gray-400 dark:text-gray-500">
              {Object.values(columnasFiltradas).reduce((sum, p) => sum + p.length, 0)}{" "}
              pedidos activos
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="text-center text-gray-400 py-12">
            Cargando pipeline...
          </div>
        ) : Object.keys(columnasFiltradas).length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No hay pedidos activos en producción.
          </div>
        ) : (
          <KanbanBoard
            columnas={columnasFiltradas}
            areas={areas}
            getNextForPedido={getNextForPedido}
            onAvanzarPedido={avanzarPedido}
            onCancelarPedido={rol && ROL_PERMITIDOS_CANCELAR.includes(rol) ? cancelarPedido : undefined}
          />
        )}
      </div>

      <KanbanToast toasts={toasts} onRemove={handleRemoveToast} />
    </div>
  );
}
