"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ESTADOS_PEDIDO, AREAS_PRODUCCION_DATA } from "@/lib/utils/constantes";
import { actualizarEstadoPedido, cancelarPedido, actualizarPedido } from "@/lib/services/pedidos";
import { EditPedidoForm } from "./EditPedidoForm";
import type { Pedido, Atributo, AtributoValor, MetodoPago, RutaProduccion, LineaPedidoDraft } from "@/lib/supabase/types";

const COLOR_PAGO: Record<string, string> = {
  Efectivo: "bg-emerald-500",
  Tarjeta: "bg-blue-500",
  Transferencia: "bg-purple-500",
};

function formatearFecha(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

interface TablaPedidosProps {
  pedidos: Pedido[];
  atributosPool: (Atributo & { valores: AtributoValor[] })[];
  onEstadoCambiado: () => void;
}

export function TablaPedidos({ pedidos, atributosPool, onEstadoCambiado }: TablaPedidosProps) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);

  async function cambiarEstado(pedidoId: string, nuevoEstado: string) {
    setCambiando(pedidoId);
    try {
      await actualizarEstadoPedido(pedidoId, nuevoEstado);
      onEstadoCambiado();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    } finally {
      setCambiando(null);
    }
  }

  async function handleCancelar(pedidoId: string) {
    if (!window.confirm("\u00bfCancelar este pedido?")) return;
    setCancelando(pedidoId);
    try {
      await cancelarPedido(pedidoId);
      onEstadoCambiado();
    } catch (err) {
      console.error("Error al cancelar pedido:", err);
    } finally {
      setCancelando(null);
    }
  }

  async function handleGuardarEdicion(
    pedidoId: string,
    data: {
      cliente_nombre: string;
      cliente_telefono: string;
      fecha_entrega: string;
      hora_entrega: string;
      requiere_correccion: boolean;
      subtotal: number;
      anticipo: number;
      total: number;
      metodo_pago: MetodoPago;
      ruta: RutaProduccion;
      lineas: LineaPedidoDraft[];
    },
  ) {
    await actualizarPedido(pedidoId, data);
    setEditando(null);
    onEstadoCambiado();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 px-3 font-medium text-gray-500 w-10">#</th>
            <th className="py-2 px-3 font-medium text-gray-500">Cliente</th>
            <th className="py-2 px-3 font-medium text-gray-500 hidden md:table-cell">
              Teléfono
            </th>
            <th className="py-2 px-3 font-medium text-gray-500">Entrega</th>
            <th className="py-2 px-3 font-medium text-gray-500">Total</th>
            <th className="py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">
              Anticipo
            </th>
            <th className="py-2 px-3 font-medium text-gray-500">Pago</th>
            <th className="py-2 px-3 font-medium text-gray-500">Área</th>
            <th className="py-2 px-3 font-medium text-gray-500">Estado</th>
            <th className="py-2 px-3 font-medium text-gray-500 text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p, idx) => (
            <PedidoFila
              key={p.id}
              pedido={p}
              indice={idx}
              expandido={expandido === p.id}
              editando={editando === p.id}
              onToggle={() => {
                if (editando === p.id) return;
                setExpandido((prev) => (prev === p.id ? null : p.id));
              }}
              onEditar={() => {
                setExpandido(p.id);
                setEditando(p.id);
              }}
              onCancelEdit={() => setEditando(null)}
              cambiando={cambiando === p.id}
              cancelando={cancelando === p.id}
              onCambiarEstado={(estado) => cambiarEstado(p.id, estado)}
              onCancelar={() => handleCancelar(p.id)}
              onGuardarEdicion={(data) => handleGuardarEdicion(p.id, data)}
              atributosPool={atributosPool}
            />
          ))}
          {pedidos.length === 0 && (
            <tr>
              <td colSpan={10} className="py-8 text-center text-gray-400">
                No se encontraron pedidos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PedidoFila({
  pedido,
  indice,
  expandido,
  editando,
  onToggle,
  onEditar,
  onCancelEdit,
  cambiando,
  cancelando,
  onCambiarEstado,
  onCancelar,
  onGuardarEdicion,
  atributosPool,
}: {
  pedido: Pedido;
  indice: number;
  expandido: boolean;
  editando: boolean;
  onToggle: () => void;
  onEditar: () => void;
  onCancelEdit: () => void;
  cambiando: boolean;
  cancelando: boolean;
  onCambiarEstado: (estado: string) => void;
  onCancelar: () => void;
  onGuardarEdicion: (data: {
    cliente_nombre: string;
    cliente_telefono: string;
    fecha_entrega: string;
    hora_entrega: string;
    requiere_correccion: boolean;
    subtotal: number;
    anticipo: number;
    total: number;
    metodo_pago: MetodoPago;
    ruta: RutaProduccion;
    lineas: LineaPedidoDraft[];
  }) => Promise<void>;
  atributosPool: (Atributo & { valores: AtributoValor[] })[];
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
      >
        <td className="py-2 px-3 text-gray-400 text-xs">{indice + 1}</td>
        <td className="py-2 px-3 text-gray-900 font-medium">
          {pedido.cliente_nombre}
          {pedido.requiere_correccion && (
            <span className="ml-1.5 text-orange-500 text-xs" title="Requiere corrección">
              &#9679;
            </span>
          )}
        </td>
        <td className="py-2 px-3 text-gray-500 hidden md:table-cell">
          {pedido.cliente_telefono || "—"}
        </td>
        <td className="py-2 px-3 text-gray-700 text-xs">
          <div>{formatearFecha(pedido.fecha_entrega)}</div>
          <div className="text-gray-400">{pedido.hora_entrega.slice(0, 5)}</div>
        </td>
        <td className="py-2 px-3 text-gray-900 font-medium">
          ${pedido.total.toFixed(2)}
        </td>
        <td className="py-2 px-3 text-gray-600 hidden sm:table-cell">
          ${pedido.anticipo.toFixed(2)}
        </td>
        <td className="py-2 px-3">
          <Badge color={COLOR_PAGO[pedido.metodo_pago] || "bg-gray-500"}>
            {pedido.metodo_pago}
          </Badge>
        </td>
        <td className="py-2 px-3">
          <AreaBadge area={pedido.area_actual} />
        </td>
        <td className="py-2 px-3">
          <EstadoBadge estado={pedido.estado} />
        </td>
        <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            <a
              href={`/mostrador/ticket/${pedido.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
              title="Ver ticket"
            >
              Ticket
            </a>
            {pedido.estado !== "cancelado" && (
              <button
                onClick={editando ? onCancelEdit : onEditar}
                className={`text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                  editando
                    ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    : "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                }`}
                title={editando ? "Cancelar edición" : "Editar pedido"}
              >
                {editando ? "Cerrar" : "Editar"}
              </button>
            )}
            <select
              value={pedido.estado}
              disabled={cambiando || editando}
              onChange={(e) => {
                if (e.target.value !== pedido.estado) {
                  onCambiarEstado(e.target.value);
                }
              }}
              className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-600 cursor-pointer"
              title="Cambiar estado"
            >
              {ESTADOS_PEDIDO.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
            {pedido.estado !== "cancelado" && pedido.estado !== "entregado" && !editando && (
              <button
                onClick={onCancelar}
                disabled={cancelando}
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-1.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Cancelar pedido"
              >
                {cancelando ? "..." : "Cancelar"}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expandido && (
        <tr>
          <td colSpan={10} className="bg-gray-50 border-b border-gray-200">
            {editando ? (
              <EditPedidoForm
                pedido={pedido}
                atributosPool={atributosPool}
                onSave={onGuardarEdicion}
                onCancel={onCancelEdit}
              />
            ) : (
              <FilaExpandida pedido={pedido} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function FilaExpandida({ pedido }: { pedido: Pedido }) {
  const lineas = pedido.detalle_pedidos ?? [];

  return (
    <div className="px-6 py-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-gray-400">Recibido:</span>{" "}
          <span className="text-gray-700">
            {formatearFecha(pedido.fecha_recepcion)} {pedido.hora_recepcion?.slice(0, 5)}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Subtotal:</span>{" "}
          <span className="text-gray-700">${pedido.subtotal.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-400">Resta:</span>{" "}
          <span className="text-gray-700">
            ${(pedido.total - pedido.anticipo).toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Corrección:</span>{" "}
          <span className={pedido.requiere_correccion ? "text-orange-600 font-medium" : "text-gray-700"}>
            {pedido.requiere_correccion ? "Sí" : "No"}
          </span>
        </div>
      </div>

      {lineas.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-200">
              <th className="py-1 pr-3 text-left font-medium">Producto</th>
              <th className="py-1 px-2 text-center font-medium w-16">Cant.</th>
              <th className="py-1 px-2 text-right font-medium w-20">P. Unit.</th>
              <th className="py-1 pl-2 text-right font-medium w-20">Importe</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-1 pr-3 text-gray-700">{l.producto_nombre}</td>
                <td className="py-1 px-2 text-center text-gray-600">{l.cantidad}</td>
                <td className="py-1 px-2 text-right text-gray-600">
                  ${l.precio_unitario.toFixed(2)}
                </td>
                <td className="py-1 pl-2 text-right text-gray-800 font-medium">
                  ${l.importe_linea.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const def = ESTADOS_PEDIDO.find((e) => e.value === estado);
  const color = def ? def.color.replace("bg-", "bg-").replace("-500", "-100") : "bg-gray-100";
  const textoColor = def
    ? def.color.replace("bg-", "text-").replace("-500", "-700")
    : "text-gray-700";
  const label = def?.label ?? estado;

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color} ${textoColor}`}>
      {label}
    </span>
  );
}

function AreaBadge({ area }: { area: string }) {
  const def = AREAS_PRODUCCION_DATA.find((a) => a.id === area);
  const color = def
    ? def.color.replace("-500", "-50").replace("bg-", "bg-")
    : "bg-gray-50";
  const textoColor = def
    ? def.color.replace("-500", "-700").replace("bg-", "text-")
    : "text-gray-700";
  const borderColor = def
    ? def.color.replace("-500", "-400").replace("bg-", "border-")
    : "border-gray-300";
  const label = def?.nombre ?? area;

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${color} ${textoColor} ${borderColor}`}>
      {label}
    </span>
  );
}
