"use client";

import { ESTADOS_PEDIDO } from "@/lib/utils/constantes";

interface FiltrosProduccionProps {
  busqueda: string;
  estado: string;
  requiereCorreccion: string;
  zona: "taller" | "corte";
  onCambiar: (filtros: {
    busqueda?: string;
    estado?: string;
    requiereCorreccion?: string;
  }) => void;
  onLimpiar: () => void;
}

export function FiltrosProduccion({
  busqueda,
  estado,
  requiereCorreccion,
  zona,
  onCambiar,
  onLimpiar,
}: FiltrosProduccionProps) {
  const activos = busqueda || estado || requiereCorreccion;

  const estadosDisponibles =
    zona === "taller"
      ? ESTADOS_PEDIDO.filter(
          (e) => e.value === "pendiente" || e.value === "en_taller",
        )
      : ESTADOS_PEDIDO.filter(
          (e) => e.value === "en_taller" || e.value === "en_corte",
        );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1 min-w-[180px]">
        <label className="text-xs font-medium text-gray-500">Cliente</label>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => onCambiar({ busqueda: e.target.value })}
          placeholder="Buscar por nombre..."
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1 min-w-[130px]">
        <label className="text-xs font-medium text-gray-500">Estado</label>
        <select
          value={estado}
          onChange={(e) => onCambiar({ estado: e.target.value })}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos</option>
          {estadosDisponibles.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Corrección</label>
        <select
          value={requiereCorreccion}
          onChange={(e) => onCambiar({ requiereCorreccion: e.target.value })}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todas</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      </div>

      {activos && (
        <div className="pb-0.5">
          <button
            onClick={onLimpiar}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
