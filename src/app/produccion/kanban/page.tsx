"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { usePedidosKanban } from "@/lib/hooks/usePedidosKanban";
import { fetchProductionAreas, fetchUserRole } from "@/lib/services/workflow";
import { AREAS_PRODUCCION_DATA, RUTAS_PRODUCCION, NOMBRE_EMPRESA } from "@/lib/utils/constantes";
import { KanbanBoard } from "../_components/KanbanBoard";
import { KanbanListView } from "../_components/KanbanListView";
import { PedidoDetailPanel } from "../_components/PedidoDetailPanel";
import { KanbanMetrics, computeMetrics } from "../_components/KanbanMetrics";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/app/_components/NotificationBell";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import type { Pedido } from "@/lib/supabase/types";

const ROLES_DEPARTAMENTO = [
  "diseno", "impresion", "laminado", "montaje",
  "books", "bastidores", "marcos", "taller", "corte",
];

const ROL_PERMITIDOS_CANCELAR = [
  "mostrador", "taller", "corte", "admin", "superadmin",
];

const ROL_PERMITIDOS_REGRESAR = [
  "admin", "superadmin", "mostrador", "taller", "corte",
];

function getDepartamentoFromRol(rol: string | null): string | undefined {
  if (!rol) return undefined;
  if (["admin", "superadmin"].includes(rol)) return undefined;
  if (ROLES_DEPARTAMENTO.includes(rol)) return rol;
  return undefined;
}

function getSlaLevel(fechaEntrega: string, horaEntrega: string): string {
  const due = new Date(`${fechaEntrega}T${horaEntrega}`).getTime();
  const now = Date.now();
  const diffMs = due - now;
  if (diffMs < 0) return "danger";
  if (diffMs < 24 * 60 * 60 * 1000) return "warning";
  return "ok";
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
  const { showError, showSuccess } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [rolCargando, setRolCargando] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setRolCargando(false);
      return;
    }
    fetchUserRole()
      .then((r) => {
        setRol(r);
        setRolCargando(false);
      })
      .catch(() => {
        setRolCargando(false);
        showError("Error al verificar permisos de usuario.");
      });
  }, [session?.user?.id, showError]);

  const areaFiltro = getDepartamentoFromRol(rol);

  const [areas, setAreas] = useState<{ id: string; nombre: string; color: string; orden: number }[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCorreccion, setFiltroCorreccion] = useState("");
  const [filtroRuta, setFiltroRuta] = useState("");
  const [filtroSla, setFiltroSla] = useState("");
  const [muted, setMuted] = useState(false);
  const [soloMios, setSoloMios] = useState(false);
  const [vistaLista, setVistaLista] = useState(false);
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [metricsVisible, setMetricsVisible] = useState(true);

  const pushNotifications = usePushNotifications(session?.user?.id ?? null);

  const handleNuevoPedido = useCallback(
    (pedido: Pedido) => {
      const areaNombre = areas.find((a) => a.id === pedido.area_actual)?.nombre || pedido.area_actual;
      showSuccess(`Nuevo pedido: ${pedido.cliente_nombre} → ${areaNombre}`);
      if (!muted) playChime();
    },
    [muted, areas, showSuccess],
  );

  const { columnas, cargando, getNextForPedido, avanzarPedido, cancelarPedido, regresarPedido, bulkAvanzar, getTiempoEnColumna, recargar } =
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
  }, [session?.user?.id, showError]);

  const areaNombre = areas.find((a) => a.id === areaFiltro)?.nombre;

  const hayFiltrosActivos = busqueda !== "" || filtroCorreccion !== "" || filtroRuta !== "" || filtroSla !== "";

  const columnasFiltradas = useMemo(() => {
    let result: Record<string, Pedido[]> = {};

    for (const [area, pedidos] of Object.entries(columnas)) {
      const filtrados = pedidos.filter((p) => {
        if (busqueda) {
          const term = busqueda.toLowerCase();
          const matchCliente = p.cliente_nombre.toLowerCase().includes(term);
          const matchPedido = p.numero_pedido?.toLowerCase().includes(term);
          if (!matchCliente && !matchPedido) return false;
        }
        if (filtroCorreccion === "si" && !p.requiere_correccion) return false;
        if (filtroCorreccion === "no" && p.requiere_correccion) return false;
        if (filtroRuta && p.ruta !== filtroRuta) return false;
        if (filtroSla) {
          const sla = getSlaLevel(p.fecha_entrega, p.hora_entrega);
          if (sla !== filtroSla) return false;
        }
        return true;
      });
      result[area] = filtrados;
    }

    if (soloMios && areaFiltro) {
      const soloMias: Record<string, Pedido[]> = {};
      for (const [area, pedidos] of Object.entries(result)) {
        if (area === areaFiltro) soloMias[area] = pedidos;
      }
      result = soloMias;
    }

    return result;
  }, [columnas, busqueda, filtroCorreccion, filtroRuta, filtroSla, soloMios, areaFiltro]);

  const metricas = useMemo(
    () => computeMetrics(columnasFiltradas, areas.filter((a) => a.id !== "entregado")),
    [columnasFiltradas, areas],
  );

  const detailOpen = pedidoDetalle !== null;

  function handleCloseDetail() {
    setPedidoDetalle(null);
  }

  function handleToggleColumn(areaId: string) {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (detailOpen && e.key === "Escape") {
        handleCloseDetail();
        return;
      }
      if (e.ctrlKey || e.metaKey) return;

      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          searchRef.current?.focus();
          break;
        case "l":
          e.preventDefault();
          setVistaLista((v) => !v);
          break;
        case "m":
          e.preventDefault();
          setMetricsVisible((v) => !v);
          break;
        case "u":
          e.preventDefault();
          setSoloMios((v) => !v);
          break;
        case "r":
          if (!e.ctrlKey) { e.preventDefault(); recargar(); }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailOpen, recargar]);

  if (rolCargando) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <i className="fas fa-spinner animate-spin" />
          Cargando...
        </div>
      </div>
    );
  }

  const totalFiltrado = Object.values(columnasFiltradas).reduce((sum, p) => sum + p.length, 0);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {NOMBRE_EMPRESA} - {areaNombre || "PRODUCCIÓN"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pipeline de Producción
            <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500">
              Presiona <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">F</kbd> buscar ·{" "}
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">L</kbd> vista ·{" "}
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">M</kbd> métricas
              {areaFiltro && <> · <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">U</kbd> mis pedidos</>}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell
            supported={pushNotifications.supported}
            permission={pushNotifications.permission}
            subscribed={pushNotifications.subscribed}
            loading={pushNotifications.loading}
            onToggle={pushNotifications.toggle}
          />
          <Tooltip content={muted ? "Activar sonido" : "Silenciar notificaciones"}>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="text-sm cursor-pointer leading-none select-none text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <i className={`fas ${muted ? "fa-volume-mute" : "fa-volume-up"}`} />
            </button>
          </Tooltip>
          <Tooltip content="Alternar vista kanban/lista">
            <button
              type="button"
              onClick={() => setVistaLista((v) => !v)}
              className="text-sm cursor-pointer leading-none select-none text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <i className={`fas ${vistaLista ? "fa-columns" : "fa-list"}`} />
            </button>
          </Tooltip>
          <Tooltip content="Alternar panel de métricas">
            <button
              type="button"
              onClick={() => setMetricsVisible((v) => !v)}
              className={`text-sm cursor-pointer leading-none select-none p-1.5 rounded-lg transition-colors ${metricsVisible ? "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            >
              <i className="fas fa-chart-pie" />
            </button>
          </Tooltip>
          {areaFiltro && (
            <Tooltip content={soloMios ? "Mostrar todas las columnas" : "Mostrar solo mi área"}>
              <button
                type="button"
                onClick={() => setSoloMios((v) => !v)}
                className={`text-sm cursor-pointer leading-none select-none p-1.5 rounded-lg transition-colors ${soloMios ? "text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <i className="fas fa-user-check" />
              </button>
            </Tooltip>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">{session?.user.email}</span>
          <Button variant="ghost" size="sm" onClick={recargar}>
            <i className="fas fa-sync-alt mr-1" />
            Actualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <i className="fas fa-sign-out-alt mr-1" />
            Salir
          </Button>
        </div>
      </header>

      <div className="max-w-full mx-auto p-4">
        {metricsVisible && (
          <KanbanMetrics data={metricas} loading={cargando} />
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 min-w-55">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <i className="fas fa-search mr-1" />
                Buscar
              </label>
              <input
                ref={searchRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Cliente o #pedido..."
                className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
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

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Ruta
              </label>
              <select
                value={filtroRuta}
                onChange={(e) => setFiltroRuta(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las rutas</option>
                {RUTAS_PRODUCCION.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Estado SLA
              </label>
              <select
                value={filtroSla}
                onChange={(e) => setFiltroSla(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="danger">Vencidos</option>
                <option value="warning">Próximos a vencer</option>
                <option value="ok">En tiempo</option>
              </select>
            </div>

            {hayFiltrosActivos && (
              <div className="pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setFiltroCorreccion("");
                    setFiltroRuta("");
                    setFiltroSla("");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium cursor-pointer inline-flex items-center gap-1"
                >
                  <i className="fas fa-times-circle" />
                  Limpiar filtros
                </button>
              </div>
            )}

            <div className="flex-1" />

            <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 pb-1">
              <i className="fas fa-box" />
              {totalFiltrado} pedidos activos
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="text-center text-gray-400 py-12 space-y-3">
            <i className="fas fa-spinner animate-spin text-2xl" />
            <p>Cargando pipeline...</p>
          </div>
        ) : Object.keys(columnasFiltradas).length === 0 && !hayFiltrosActivos ? (
          <div className="text-center py-16 space-y-3">
            <i className="fas fa-inbox text-5xl text-gray-200 dark:text-gray-700" />
            <p className="text-gray-400 dark:text-gray-500 text-lg">No hay pedidos activos en producción.</p>
            <p className="text-xs text-gray-400 dark:text-gray-600">Crea un nuevo pedido para comenzar</p>
          </div>
        ) : vistaLista ? (
          <KanbanListView
            columnas={columnasFiltradas}
            areas={areas}
            getNextForPedido={getNextForPedido}
            onAvanzarPedido={avanzarPedido}
            getTiempoEnColumna={getTiempoEnColumna}
            onClickDetalle={(p) => setPedidoDetalle(p)}
            areaFiltro={areaFiltro}
          />
        ) : (
          <KanbanBoard
            columnas={columnasFiltradas}
            areas={areas}
            getNextForPedido={getNextForPedido}
            onAvanzarPedido={avanzarPedido}
            onCancelarPedido={rol && ROL_PERMITIDOS_CANCELAR.includes(rol) ? cancelarPedido : undefined}
            onRegresarPedido={rol && ROL_PERMITIDOS_REGRESAR.includes(rol) ? regresarPedido : undefined}
            onBulkAvanzar={bulkAvanzar}
            getTiempoEnColumna={getTiempoEnColumna}
            hayFiltrosActivos={hayFiltrosActivos}
            onClickDetalle={(p) => setPedidoDetalle(p)}
            collapsedColumns={collapsedColumns}
            onToggleColumnCollapse={handleToggleColumn}
          />
        )}
      </div>

      <PedidoDetailPanel
        pedido={pedidoDetalle}
        open={detailOpen}
        onClose={handleCloseDetail}
        tiempoEnColumna={pedidoDetalle ? getTiempoEnColumna?.(pedidoDetalle.id) : null}
        areas={areas}
        nextAreas={pedidoDetalle ? getNextForPedido(pedidoDetalle) : []}
        onAvanzarPedido={avanzarPedido}
      />
    </div>
  );
}
