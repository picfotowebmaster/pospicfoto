"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ESTADOS_PEDIDO, AREAS_PRODUCCION_DATA } from "@/lib/utils/constantes";
import { actualizarEstadoPedido, cancelarPedido, actualizarPedido } from "@/lib/services/pedidos";
import { PedidoDetailModal } from "./PedidoDetailModal";
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
  const { showError, showSuccess } = useToast();
  const [pedidoModalId, setPedidoModalId] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [facturando, setFacturando] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  async function cambiarEstado(pedidoId: string, nuevoEstado: string) {
    setCambiando(pedidoId);
    try {
      await actualizarEstadoPedido(pedidoId, nuevoEstado);
      onEstadoCambiado();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      showError("Error al cambiar estado del pedido.");
    } finally {
      setCambiando(null);
    }
  }

  async function handleCancelar(pedidoId: string) {
    setConfirmCancel(pedidoId);
  }

  async function handleFacturar(pedidoId: string) {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    setFacturando(pedidoId);
    try {
      const res = await fetch("/api/facturacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pedido.numero_pedido || pedido.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || "Error al emitir la factura");
      } else if (data.emailEnviado) {
        showSuccess(`Factura emitida y enviada a ${pedido.cliente_email}`);
        onEstadoCambiado();
      } else if (pedido.cliente_email) {
        showSuccess("Factura emitida, pero no se pudo enviar el correo (revisa los logs).");
        onEstadoCambiado();
      } else {
        showSuccess("Factura emitida correctamente");
        onEstadoCambiado();
      }
    } catch {
      showError("Error de conexión al emitir la factura");
    } finally {
      setFacturando(null);
    }
  }

  async function executeCancelar() {
    const pedidoId = confirmCancel;
    setConfirmCancel(null);
    if (!pedidoId) return;
    setCancelando(pedidoId);
    try {
      await cancelarPedido(pedidoId);
      onEstadoCambiado();
    } catch (err) {
      console.error("Error al cancelar pedido:", err);
      showError("Error al cancelar el pedido.");
    } finally {
      setCancelando(null);
    }
  }

  async function handleGuardarEdicion(
    pedidoId: string,
    data: {
      cliente_nombre: string;
      cliente_telefono: string;
      cliente_email: string;
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

  const pedidoModal = pedidos.find((p) => p.id === pedidoModalId) ?? null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 px-3 font-medium text-gray-500 w-[140px]">Pedido</th>
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
          {pedidos.map((p) => (
            <PedidoFila
              key={p.id}
              pedido={p}
              cambiando={cambiando === p.id}
              cancelando={cancelando === p.id}
              facturando={facturando === p.id}
              onAbrirDetalle={() => {
                setPedidoModalId(p.id);
                setEditando(null);
              }}
              onEditar={() => {
                setPedidoModalId(p.id);
                setEditando(p.id);
              }}
              onCambiarEstado={(estado) => cambiarEstado(p.id, estado)}
              onCancelar={() => handleCancelar(p.id)}
              onFacturar={() => handleFacturar(p.id)}
            />
          ))}
          {pedidos.length === 0 && (
            <tr>
              <td colSpan={10} className="py-8 text-center text-gray-400 dark:text-gray-500">
                No se encontraron pedidos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <ConfirmModal
        open={confirmCancel !== null}
        title="Cancelar pedido"
        message={confirmCancel ? `¿Estás seguro de cancelar el pedido ${pedidos.find((p) => p.id === confirmCancel)?.numero_pedido || ""}?` : ""}
        confirmLabel="Sí, cancelar"
        cancelLabel="No cancelar"
        variant="danger"
        onConfirm={executeCancelar}
        onCancel={() => setConfirmCancel(null)}
      />
      <PedidoDetailModal
        pedido={pedidoModal}
        open={pedidoModal !== null}
        editando={editando === pedidoModalId}
        facturando={pedidoModalId !== null && facturando === pedidoModalId}
        atributosPool={atributosPool}
        onClose={() => {
          setPedidoModalId(null);
          setEditando(null);
        }}
        onIniciarEdicion={() => setEditando(pedidoModalId)}
        onCancelarEdicion={() => setEditando(null)}
        onFacturar={() => {
          if (pedidoModalId) handleFacturar(pedidoModalId);
        }}
        onGuardarEdicion={(data) =>
          pedidoModal ? handleGuardarEdicion(pedidoModal.id, data) : Promise.resolve()
        }
      />
    </div>
  );
}

function PedidoFila({
  pedido,
  cambiando,
  cancelando,
  facturando,
  onAbrirDetalle,
  onEditar,
  onCambiarEstado,
  onCancelar,
  onFacturar,
}: {
  pedido: Pedido;
  cambiando: boolean;
  cancelando: boolean;
  facturando: boolean;
  onAbrirDetalle: () => void;
  onEditar: () => void;
  onCambiarEstado: (estado: string) => void;
  onCancelar: () => void;
  onFacturar: () => void;
}) {
  return (
    <tr
      onClick={onAbrirDetalle}
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
    >
      <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-mono text-xs font-medium">
        {pedido.numero_pedido || "\u2014"}
      </td>
      <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-medium">
        {pedido.cliente_nombre}
        {pedido.requiere_correccion && (
          <span className="ml-1.5 text-orange-500 text-xs" title="Requiere corrección">
            <i className="fas fa-circle text-[6px] align-middle" />
          </span>
        )}
      </td>
      <td className="py-2 px-3 text-gray-500 hidden md:table-cell dark:text-gray-400">
        {pedido.cliente_telefono || "\u2014"}
      </td>
      <td className="py-2 px-3 text-gray-700 dark:text-gray-300 text-xs">
        <div>{formatearFecha(pedido.fecha_entrega)}</div>
        <div className="text-gray-400 dark:text-gray-500">{pedido.hora_entrega.slice(0, 5)}</div>
      </td>
      <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-medium">
        ${pedido.total.toFixed(2)}
      </td>
      <td className="py-2 px-3 text-gray-600 hidden sm:table-cell dark:text-gray-400">
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
            href={`/mostrador/ticket/${pedido.numero_pedido || pedido.id}`}
            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
            title="Ver ticket"
          >
            Ticket
          </a>
          {pedido.estado !== "cancelado" && (
            <button
              type="button"
              onClick={onEditar}
              className="text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
              title="Editar pedido"
            >
              Editar
            </button>
          )}
          {pedido.estado === "entregado" &&
            (pedido.factura_uuid ? (
              <>
                {pedido.factura_pdf_url && (
                  <a
                    href={pedido.factura_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Descargar factura PDF"
                  >
                    PDF
                  </a>
                )}
                {pedido.factura_xml_url && (
                  <a
                    href={pedido.factura_xml_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Ver XML"
                  >
                    XML
                  </a>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onFacturar}
                disabled={facturando}
                className="text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50 text-green-600 hover:text-green-800 hover:bg-green-50"
                title="Emitir factura"
              >
                {facturando ? "..." : "Facturar"}
              </button>
            ))}
          <select
            value={pedido.estado}
            disabled={cambiando}
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
          {pedido.estado !== "cancelado" && pedido.estado !== "entregado" && (
            <button
              type="button"
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
