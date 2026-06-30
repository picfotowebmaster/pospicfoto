"use client";

import { ESTADOS_PEDIDO, METODOS_PAGO, AREAS_PRODUCCION_DATA } from "@/lib/utils/constantes";

interface FiltrosPedidosProps {
  busqueda: string;
  ticketId: string;
  estado: string;
  metodoPago: string;
  fechaDesde: string;
  fechaHasta: string;
  requiereCorreccion: string;
  areaActual: string;
  onCambiar: (filtros: {
    busqueda?: string;
    ticketId?: string;
    estado?: string;
    metodoPago?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    requiereCorreccion?: string;
    areaActual?: string;
  }) => void;
  onLimpiar: () => void;
}

export function FiltrosPedidos({
  busqueda,
  ticketId,
  estado,
  metodoPago,
  fechaDesde,
  fechaHasta,
  requiereCorreccion,
  areaActual,
  onCambiar,
  onLimpiar,
}: FiltrosPedidosProps) {
  const activos =
    busqueda || ticketId || estado || metodoPago || fechaDesde || fechaHasta || requiereCorreccion || areaActual;

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

      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-xs font-medium text-gray-500">Ticket ID</label>
        <input
          type="text"
          value={ticketId}
          onChange={(e) => onCambiar({ ticketId: e.target.value })}
          placeholder="ej. A3F2B1C4"
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
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
          {ESTADOS_PEDIDO.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 min-w-[130px]">
        <label className="text-xs font-medium text-gray-500">Pago</label>
        <select
          value={metodoPago}
          onChange={(e) => onCambiar({ metodoPago: e.target.value })}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos</option>
          {METODOS_PAGO.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 min-w-[130px]">
        <label className="text-xs font-medium text-gray-500">Desde</label>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => onCambiar({ fechaDesde: e.target.value })}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1 min-w-[130px]">
        <label className="text-xs font-medium text-gray-500">Hasta</label>
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => onCambiar({ fechaHasta: e.target.value })}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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

      <div className="flex flex-col gap-1 min-w-[130px]">
        <label className="text-xs font-medium text-gray-500">Departamento</label>
        <select
          value={areaActual}
          onChange={(e) => onCambiar({ areaActual: e.target.value })}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos</option>
          {AREAS_PRODUCCION_DATA.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
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
