"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { usePedidosKanban } from "@/lib/hooks/usePedidosKanban";
import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { fetchProductionAreas, fetchUserRole } from "@/lib/services/workflow";
import { AREAS_PRODUCCION_DATA, RUTAS_PRODUCCION, NOMBRE_EMPRESA, WIP_LIMITS } from "@/lib/utils/constantes";
import { getSlaLevel } from "@/lib/utils/pedido";
import { KanbanBoard } from "../_components/KanbanBoard";
import { KanbanListView } from "../_components/KanbanListView";
import { PedidoDetailPanel } from "../_components/PedidoDetailPanel";
import { KanbanMetrics, computeMetrics } from "../_components/KanbanMetrics";
import { VistasGuardadas, type VistaFiltros, type VistaGuardada } from "../_components/VistasGuardadas";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/app/_components/NotificationBell";
import RoleSwitcher from "@/app/_components/RoleSwitcher";
import { NotificationCenter } from "../_components/NotificationCenter";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { useNotificaciones } from "@/lib/hooks/useNotificaciones";
import type { Pedido, PrioridadPedido, MetodoPago } from "@/lib/supabase/types";

const ROLES_DEPARTAMENTO = [
  "diseno", "impresion", "laminado", "montaje",
  "books", "bastidores", "marcos",
];

const ROL_PERMITIDOS_CANCELAR = [
  "mostrador", "taller", "corte", "admin", "superadmin",
];

const ROL_PERMITIDOS_REGRESAR = [
  "admin", "superadmin", "mostrador", "taller", "corte",
];

const LS_PREFIX = "kanban.v1";

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

const CHIP_BASE = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none";
const CHIP_ON = "bg-blue-600 text-white border-blue-600 shadow-sm";
const CHIP_OFF = "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500";

export default function KanbanPage() {
  const { session, signOut } = useAuth();
  const { showError, showSuccess } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const [rol, setRol] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchUserRole()
      .then((r) => setRol(r))
      .catch(() => {
        setRol(null);
        showError("Error al verificar permisos de usuario.");
      });
  }, [session?.user?.id, showError]);

  const rolCargando = rol === undefined;
  const areaFiltro = getDepartamentoFromRol(rol ?? null);
  const usuarioId = session?.user?.id ?? null;

  const [areas, setAreas] = useState<{ id: string; nombre: string; color: string; orden: number }[]>([]);
  const [busqueda, setBusqueda] = usePersistentState(`${LS_PREFIX}.busqueda`, "");
  const [filtroCorreccion, setFiltroCorreccion] = usePersistentState(`${LS_PREFIX}.correccion`, "");
  const [filtroRuta, setFiltroRuta] = usePersistentState(`${LS_PREFIX}.ruta`, "");
  const [filtroSla, setFiltroSla] = usePersistentState(`${LS_PREFIX}.sla`, "");
  const [muted, setMuted] = usePersistentState(`${LS_PREFIX}.muted`, false);
  const [soloMios, setSoloMios] = usePersistentState(`${LS_PREFIX}.soloMios`, false);
  const [soloAsignados, setSoloAsignados] = usePersistentState(`${LS_PREFIX}.soloAsignados`, false);
  const [vistaLista, setVistaLista] = usePersistentState(`${LS_PREFIX}.vistaLista`, false);
  const [metricsVisible, setMetricsVisible] = usePersistentState(`${LS_PREFIX}.metrics`, true);
  const [vistas, setVistas] = usePersistentState<VistaGuardada[]>(`${LS_PREFIX}.vistas`, []);
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const pushNotifications = usePushNotifications(session?.user?.id ?? null);
  const notif = useNotificaciones(areaFiltro);

  const handleNuevoPedido = useCallback(
    (pedido: Pedido) => {
      const areaNombre = areas.find((a) => a.id === pedido.area_actual)?.nombre || pedido.area_actual;
      showSuccess(`Nuevo pedido: ${pedido.cliente_nombre} → ${areaNombre}`);
      if (!muted) playChime();
    },
    [muted, areas, showSuccess],
  );

  const {
    columnas,
    pedidos,
    cargando,
    getNextForPedido,
    avanzarPedido,
    cancelarPedido,
    regresarPedido,
    bulkAvanzar,
    cambiarPrioridad,
    asignarOperador,
    guardarNotas,
    marcarCorreccion,
    liquidarSaldo,
    getTiempoEnColumna,
    getTiempoEnColumnaNivel,
    recargar,
  } = usePedidosKanban(areaFiltro, handleNuevoPedido);

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

  const contadores = useMemo(() => {
    let total = 0;
    let vencidos = 0;
    let proximos = 0;
    let correcciones = 0;
    for (const pedidos of Object.values(columnas)) {
      for (const p of pedidos) {
        total++;
        const s = getSlaLevel(p.fecha_entrega, p.hora_entrega);
        if (s === "danger") vencidos++;
        else if (s === "warning") proximos++;
        if (p.requiere_correccion) correcciones++;
      }
    }
    return { total, vencidos, proximos, correcciones };
  }, [columnas]);

  const hayFiltrosActivos = busqueda !== "" || filtroCorreccion !== "" || filtroRuta !== "" || filtroSla !== "";

  const columnasFiltradas = useMemo(() => {
    let result: Record<string, Pedido[]> = {};

    for (const [area, pedidos] of Object.entries(columnas)) {
      const filtrados = pedidos.filter((p) => {
        if (busqueda) {
          const term = busqueda.toLowerCase();
          const matchCliente = p.cliente_nombre.toLowerCase().includes(term);
          const matchPedido = p.numero_pedido?.toLowerCase().includes(term);
          const matchTelefono = p.cliente_telefono?.toLowerCase().includes(term);
          if (!matchCliente && !matchPedido && !matchTelefono) return false;
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

    if (soloAsignados && usuarioId) {
      const soloAsignadosMap: Record<string, Pedido[]> = {};
      for (const [area, pedidos] of Object.entries(result)) {
        const filtrados = pedidos.filter((p) => p.asignado_a === usuarioId);
        if (filtrados.length > 0) soloAsignadosMap[area] = filtrados;
      }
      result = soloAsignadosMap;
    }

    return result;
  }, [columnas, busqueda, filtroCorreccion, filtroRuta, filtroSla, soloMios, soloAsignados, usuarioId, areaFiltro]);

  const metricas = useMemo(
    () => computeMetrics(columnasFiltradas, areas.filter((a) => a.id !== "entregado")),
    [columnasFiltradas, areas],
  );

  const filtrosActuales: VistaFiltros = {
    busqueda,
    correccion: filtroCorreccion,
    ruta: filtroRuta,
    sla: filtroSla,
    soloMios,
    soloAsignados,
  };

  function aplicarVista(f: VistaFiltros) {
    setBusqueda(f.busqueda);
    setFiltroCorreccion(f.correccion);
    setFiltroRuta(f.ruta);
    setFiltroSla(f.sla);
    setSoloMios(f.soloMios);
    setSoloAsignados(f.soloAsignados);
  }

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

  function abrirDesdeNotificacion(pedidoId: string) {
    const p = pedidos.find((x) => x.id === pedidoId);
    if (p) setPedidoDetalle(p);
  }

  function patchDetalle(id: string, patch: Partial<Pedido>) {
    setPedidoDetalle((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }

  async function pCambiarPrioridad(id: string, prioridad: PrioridadPedido) {
    await cambiarPrioridad(id, prioridad);
    patchDetalle(id, { prioridad });
  }

  async function pAsignar(id: string, uid: string | null) {
    await asignarOperador(id, uid);
    patchDetalle(id, { asignado_a: uid });
  }

  async function pGuardarNotas(id: string, notas: string | null) {
    await guardarNotas(id, notas);
    patchDetalle(id, { notas });
  }

  async function pMarcarCorreccion(id: string, requiere: boolean, motivo: string | null) {
    await marcarCorreccion(id, requiere, motivo);
    patchDetalle(id, {
      requiere_correccion: requiere,
      motivo_correccion: requiere ? motivo : null,
    });
  }

  async function pLiquidarSaldo(id: string, metodo: MetodoPago) {
    await liquidarSaldo(id, metodo);
    patchDetalle(id, { saldo_cobrado: true, saldo_metodo_pago: metodo });
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroCorreccion("");
    setFiltroRuta("");
    setFiltroSla("");
  }

  function toggleSla(valor: string) {
    setFiltroSla((actual) => (actual === valor ? "" : valor));
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
  }, [detailOpen, recargar, setVistaLista, setMetricsVisible, setSoloMios]);

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
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {contadores.total} pendientes
            </span>
            {contadores.vencidos > 0 && (
              <span className="text-red-600 dark:text-red-400 font-semibold">
                <i className="fas fa-exclamation-triangle mr-0.5" />
                {contadores.vencidos} vencidos
              </span>
            )}
            {contadores.correcciones > 0 && (
              <span className="text-orange-600 dark:text-orange-400 font-semibold">
                <i className="fas fa-flag mr-0.5" />
                {contadores.correcciones} correcciones
              </span>
            )}
            <span className="hidden md:inline text-[10px] text-gray-400 dark:text-gray-500">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">F</kbd> buscar ·{" "}
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">L</kbd> vista ·{" "}
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">M</kbd> métricas
              {areaFiltro && <> · <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">U</kbd> mis pedidos</>}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <RoleSwitcher />
          <NotificationCenter
            notificaciones={notif.notificaciones}
            noLeidas={notif.noLeidas}
            filtroTipo={notif.filtroTipo}
            onFiltroTipo={notif.setFiltroTipo}
            soloMiArea={notif.soloMiArea}
            mostrarMiArea={!!areaFiltro}
            onToggleMiArea={() => notif.setSoloMiArea((v) => !v)}
            onMarcarTodas={notif.marcarTodasLeidas}
            onLimpiar={notif.limpiar}
            onSeleccionar={abrirDesdeNotificacion}
          />
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
              aria-label={muted ? "Activar sonido" : "Silenciar notificaciones"}
              className="text-sm cursor-pointer leading-none select-none text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <i className={`fas ${muted ? "fa-volume-mute" : "fa-volume-up"}`} />
            </button>
          </Tooltip>
          <Tooltip content="Alternar vista kanban/lista">
            <button
              type="button"
              onClick={() => setVistaLista((v) => !v)}
              aria-label="Alternar vista kanban o lista"
              className="text-sm cursor-pointer leading-none select-none text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <i className={`fas ${vistaLista ? "fa-columns" : "fa-list"}`} />
            </button>
          </Tooltip>
          <Tooltip content="Alternar panel de métricas">
            <button
              type="button"
              onClick={() => setMetricsVisible((v) => !v)}
              aria-label="Alternar panel de métricas"
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
                aria-label={soloMios ? "Mostrar todas las columnas" : "Mostrar solo mi área"}
                className={`text-sm cursor-pointer leading-none select-none p-1.5 rounded-lg transition-colors ${soloMios ? "text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <i className="fas fa-user-check" />
              </button>
            </Tooltip>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-300 hidden lg:inline">{session?.user.email}</span>
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

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 mb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { setFiltroSla(""); setFiltroCorreccion(""); }}
              className={`${CHIP_BASE} ${!filtroSla && !filtroCorreccion ? CHIP_ON : CHIP_OFF}`}
            >
              Todos
              <span className="opacity-70">({contadores.total})</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSla("danger")}
              className={`${CHIP_BASE} ${filtroSla === "danger" ? "bg-red-600 text-white border-red-600 shadow-sm" : CHIP_OFF}`}
            >
              <i className="fas fa-exclamation-triangle" />
              Vencidos
              <span className="opacity-70">({contadores.vencidos})</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSla("warning")}
              className={`${CHIP_BASE} ${filtroSla === "warning" ? "bg-amber-500 text-white border-amber-500 shadow-sm" : CHIP_OFF}`}
            >
              <i className="fas fa-clock" />
              Próximas 24h
              <span className="opacity-70">({contadores.proximos})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroCorreccion((v) => (v === "si" ? "" : "si"))}
              className={`${CHIP_BASE} ${filtroCorreccion === "si" ? "bg-orange-500 text-white border-orange-500 shadow-sm" : CHIP_OFF}`}
            >
              <i className="fas fa-flag" />
              Correcciones
              <span className="opacity-70">({contadores.correcciones})</span>
            </button>
            {areaFiltro && (
              <button
                type="button"
                onClick={() => setSoloMios((v) => !v)}
                className={`${CHIP_BASE} ${soloMios ? "bg-purple-600 text-white border-purple-600 shadow-sm" : CHIP_OFF}`}
              >
                <i className="fas fa-user-check" />
                Mi área
              </button>
            )}
            {usuarioId && (
              <button
                type="button"
                onClick={() => setSoloAsignados((v) => !v)}
                className={`${CHIP_BASE} ${soloAsignados ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : CHIP_OFF}`}
              >
                <i className="fas fa-user" />
                Asignados a mí
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <VistasGuardadas
              vistas={vistas}
              filtrosActuales={filtrosActuales}
              onGuardar={(vista) =>
                setVistas((prev) => [
                  ...prev.filter((v) => v.nombre !== vista.nombre),
                  vista,
                ])
              }
              onAplicar={aplicarVista}
              onEliminar={(nombre) =>
                setVistas((prev) => prev.filter((v) => v.nombre !== nombre))
              }
            />
          </div>

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
                placeholder="Cliente, teléfono o #pedido..."
                className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
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

            {hayFiltrosActivos && (
              <div className="pb-0.5">
                <button
                  type="button"
                  onClick={limpiarFiltros}
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
            onCancelarPedido={rol && ROL_PERMITIDOS_CANCELAR.includes(rol) ? cancelarPedido : undefined}
            onRegresarPedido={rol && ROL_PERMITIDOS_REGRESAR.includes(rol) ? regresarPedido : undefined}
            getTiempoEnColumna={getTiempoEnColumna}
            getTiempoEnColumnaNivel={getTiempoEnColumnaNivel}
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
            getTiempoEnColumnaNivel={getTiempoEnColumnaNivel}
            hayFiltrosActivos={hayFiltrosActivos}
            onClickDetalle={(p) => setPedidoDetalle(p)}
            collapsedColumns={collapsedColumns}
            onToggleColumnCollapse={handleToggleColumn}
            wipLimits={WIP_LIMITS}
            onDropInvalido={(areaNombre) =>
              showError(`Movimiento no permitido hacia ${areaNombre}.`)
            }
            usuarioId={session?.user?.id ?? null}
            onCambiarPrioridad={cambiarPrioridad}
            onAsignar={asignarOperador}
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
        usuarioId={usuarioId}
        onCambiarPrioridad={pCambiarPrioridad}
        onAsignar={pAsignar}
        onGuardarNotas={pGuardarNotas}
        onMarcarCorreccion={pMarcarCorreccion}
        onLiquidarSaldo={pLiquidarSaldo}
      />
    </div>
  );
}
