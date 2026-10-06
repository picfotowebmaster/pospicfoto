"use client";

import { useState } from "react";

export interface VistaFiltros {
  busqueda: string;
  correccion: string;
  ruta: string;
  sla: string;
  soloMios: boolean;
  soloAsignados: boolean;
}

export interface VistaGuardada {
  nombre: string;
  filtros: VistaFiltros;
}

interface VistasGuardadasProps {
  vistas: VistaGuardada[];
  filtrosActuales: VistaFiltros;
  onGuardar: (vista: VistaGuardada) => void;
  onAplicar: (filtros: VistaFiltros) => void;
  onEliminar: (nombre: string) => void;
}

export function VistasGuardadas({
  vistas,
  filtrosActuales,
  onGuardar,
  onAplicar,
  onEliminar,
}: VistasGuardadasProps) {
  const [nombre, setNombre] = useState("");
  const [seleccionada, setSeleccionada] = useState("");

  function guardar() {
    const limpio = nombre.trim();
    if (!limpio) return;
    onGuardar({ nombre: limpio, filtros: filtrosActuales });
    setNombre("");
    setSeleccionada(limpio);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        <i className="fas fa-bookmark mr-1" />
        Vistas
      </span>

      <select
        value={seleccionada}
        onChange={(e) => {
          setSeleccionada(e.target.value);
          const vista = vistas.find((v) => v.nombre === e.target.value);
          if (vista) onAplicar(vista.filtros);
        }}
        className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Seleccionar...</option>
        {vistas.map((v) => (
          <option key={v.nombre} value={v.nombre}>
            {v.nombre}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && guardar()}
        placeholder="Guardar vista como..."
        className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={guardar}
        disabled={!nombre.trim()}
        className="text-xs font-medium rounded-lg px-3 py-1.5 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 disabled:opacity-50 cursor-pointer transition-colors"
      >
        Guardar
      </button>
      {seleccionada && (
        <button
          type="button"
          onClick={() => {
            onEliminar(seleccionada);
            setSeleccionada("");
          }}
          className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 cursor-pointer inline-flex items-center gap-1"
        >
          <i className="fas fa-trash" />
          Eliminar
        </button>
      )}
    </div>
  );
}
