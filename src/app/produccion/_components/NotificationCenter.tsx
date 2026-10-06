"use client";

import { useEffect, useRef, useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { elapsedFromTime } from "@/lib/utils/pedido";
import {
  TIPOS_NOTIFICACION,
  ICONO_TIPO,
  type Notificacion,
  type TipoNotificacion,
} from "@/lib/utils/notificaciones";

interface NotificationCenterProps {
  notificaciones: Notificacion[];
  noLeidas: number;
  filtroTipo: TipoNotificacion | "";
  onFiltroTipo: (t: TipoNotificacion | "") => void;
  soloMiArea: boolean;
  mostrarMiArea: boolean;
  onToggleMiArea: () => void;
  onMarcarTodas: () => void;
  onLimpiar: () => void;
  onSeleccionar: (pedidoId: string) => void;
}

export function NotificationCenter({
  notificaciones,
  noLeidas,
  filtroTipo,
  onFiltroTipo,
  soloMiArea,
  mostrarMiArea,
  onToggleMiArea,
  onMarcarTodas,
  onLimpiar,
  onSeleccionar,
}: NotificationCenterProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  return (
    <div className="relative" ref={ref}>
      <Tooltip content="Centro de notificaciones">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-label={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ""}`}
          aria-haspopup="menu"
          aria-expanded={abierto}
          className={`text-sm cursor-pointer leading-none select-none p-1.5 rounded-lg transition-colors relative ${
            noLeidas > 0
              ? "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <i className="fas fa-bell" />
          {noLeidas > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
      </Tooltip>

      {abierto && (
        <div className="absolute right-0 mt-2 z-50 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              Notificaciones
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onMarcarTodas}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Marcar leídas
              </button>
              <button
                type="button"
                onClick={onLimpiar}
                className="text-[11px] text-gray-400 hover:text-red-500 cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => onFiltroTipo("")}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                filtroTipo === ""
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
              }`}
            >
              Todas
            </button>
            {TIPOS_NOTIFICACION.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onFiltroTipo(filtroTipo === t.value ? "" : t.value)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  filtroTipo === t.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                }`}
              >
                {t.label}
              </button>
            ))}
            {mostrarMiArea && (
              <button
                type="button"
                onClick={onToggleMiArea}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  soloMiArea
                    ? "bg-purple-600 text-white border-purple-600"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                }`}
              >
                Mi área
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {notificaciones.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
                Sin notificaciones.
              </p>
            ) : (
              notificaciones.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onSeleccionar(n.pedidoId)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-start gap-2.5 ${
                    n.leida ? "" : "bg-blue-50/50 dark:bg-blue-900/10"
                  }`}
                >
                  <i className={`fas ${ICONO_TIPO[n.tipo]} text-sm mt-0.5 text-gray-400`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
                      {n.titulo}
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {n.detalle}
                    </span>
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {elapsedFromTime(n.fecha)}
                    </span>
                  </span>
                  {!n.leida && <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
