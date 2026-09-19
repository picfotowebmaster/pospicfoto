"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ESTADOS_PEDIDO, AREAS_PRODUCCION_DATA } from "@/lib/utils/constantes";
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

interface PedidoDetailModalProps {
  pedido: Pedido | null;
  open: boolean;
  editando: boolean;
  facturando: boolean;
  atributosPool: (Atributo & { valores: AtributoValor[] })[];
  onClose: () => void;
  onIniciarEdicion: () => void;
  onCancelarEdicion: () => void;
  onFacturar: () => void;
  onGuardarEdicion: (data: {
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
  }) => Promise<void>;
}

export function PedidoDetailModal({
  pedido,
  open,
  editando,
  facturando,
  atributosPool,
  onClose,
  onIniciarEdicion,
  onCancelarEdicion,
  onFacturar,
  onGuardarEdicion,
}: PedidoDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!pedido) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-60 bg-black/30 dark:bg-black/50 transition-opacity animate-[fadeIn_150ms_ease-out]"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-60 h-full w-full ${editando ? "max-w-2xl" : "max-w-lg"} bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              {pedido.cliente_nombre}
            </h2>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500">
              {pedido.numero_pedido || "\u2014"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!editando && pedido.estado !== "cancelado" && (
              <Button variant="ghost" size="sm" onClick={onIniciarEdicion}>
                <i className="fas fa-pen mr-1" />
                Editar
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            >
              <i className="fas fa-times text-lg" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-60px)] p-5">
          {editando ? (
            <EditPedidoForm
              pedido={pedido}
              atributosPool={atributosPool}
              onSave={onGuardarEdicion}
              onCancel={onCancelarEdicion}
            />
          ) : (
            <DetallePedido pedido={pedido} facturando={facturando} onFacturar={onFacturar} />
          )}
        </div>
      </div>
    </>
  );
}

function DetallePedido({
  pedido,
  facturando,
  onFacturar,
}: {
  pedido: Pedido;
  facturando: boolean;
  onFacturar: () => void;
}) {
  const lineas = pedido.detalle_pedidos ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <EstadoBadge estado={pedido.estado} />
        <Badge color={COLOR_PAGO[pedido.metodo_pago] || "bg-gray-500"}>
          {pedido.metodo_pago}
        </Badge>
        {pedido.requiere_correccion && (
          <span className="rounded px-3 py-1 text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
            <i className="fas fa-triangle-exclamation mr-1" />
            Requiere corrección
          </span>
        )}
      </div>

      {pedido.estado === "entregado" && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
          {pedido.factura_uuid ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <i className="fas fa-check-circle" />
                Factura emitida
              </p>
              <p className="font-mono text-xs text-gray-500 dark:text-gray-400 break-all">
                UUID: {pedido.factura_uuid}
              </p>
              {pedido.cliente_email && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <i className="fas fa-envelope" />
                  {pedido.factura_email_enviado
                    ? `Enviada a ${pedido.cliente_email}`
                    : `Correo del cliente: ${pedido.cliente_email}`}
                </p>
              )}
              <div className="flex gap-3">
                {pedido.factura_pdf_url && (
                  <a
                    href={pedido.factura_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <i className="fas fa-file-pdf mr-1" />
                    Descargar PDF
                  </a>
                )}
                {pedido.factura_xml_url && (
                  <a
                    href={pedido.factura_xml_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <i className="fas fa-file-code mr-1" />
                    Ver XML
                  </a>
                )}
              </div>
            </div>
          ) : (
            <Button size="sm" variant="success" onClick={onFacturar} disabled={facturando} className="w-full">
              <i className="fas fa-file-invoice mr-1" />
              {facturando ? "Emitiendo factura..." : "Facturar (CFDI)"}
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs">
        <Campo label="Recibido" value={`${formatearFecha(pedido.fecha_recepcion)} ${pedido.hora_recepcion?.slice(0, 5)}`} />
        <Campo label="Entrega" value={`${formatearFecha(pedido.fecha_entrega)} ${pedido.hora_entrega.slice(0, 5)}`} />
        <Campo label="Subtotal" value={`$${pedido.subtotal.toFixed(2)}`} />
        <Campo label="Anticipo" value={`$${pedido.anticipo.toFixed(2)}`} />
        <Campo label="Resta" value={`$${(pedido.total - pedido.anticipo).toFixed(2)}`} />
        <Campo label="Área actual" value={<AreaBadge area={pedido.area_actual} />} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <i className="fas fa-boxes text-gray-400" />
          Productos ({lineas.length})
        </h3>
        {lineas.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Sin productos.</p>
        ) : (
          <div className="space-y-2">
            {lineas.map((l) => (
              <div
                key={l.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {l.producto_nombre}
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full px-2 py-0.5 shrink-0">
                    x{l.cantidad}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>${l.precio_unitario.toFixed(2)} c/u</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    ${l.importe_linea.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
        {label}
      </p>
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{value}</div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const def = ESTADOS_PEDIDO.find((e) => e.value === estado);
  const color = def ? def.color.replace("-500", "-100") : "bg-gray-100";
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
  const color = def ? def.color.replace("-500", "-50") : "bg-gray-50";
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
