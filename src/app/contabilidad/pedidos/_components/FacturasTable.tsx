"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Pedido } from "@/lib/supabase/types";

const COLOR_PAGO: Record<string, string> = {
  Efectivo: "bg-emerald-500",
  Tarjeta: "bg-blue-500",
  Transferencia: "bg-purple-500",
};

const MOTIVOS_LABELS: Record<string, string> = {
  "01": "01 - Errores con relación",
  "02": "02 - Errores sin relación",
  "03": "03 - No se llevó a cabo la operación",
  "04": "04 - Operación nominativa en factura global",
};

function formatearFecha(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

interface FacturasTableProps {
  pedidos: Pedido[];
  onFacturado: () => void;
}

export function FacturasTable({ pedidos, onFacturado }: FacturasTableProps) {
  const { showError, showSuccess } = useToast();
  const [facturando, setFacturando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<Pedido | null>(null);
  const [motivo, setMotivo] = useState("02");
  const [uuidRelacionado, setUuidRelacionado] = useState("");

  async function handleFacturar(pedido: Pedido) {
    setFacturando(pedido.id);
    try {
      const res = await fetch("/api/facturacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pedido.numero_pedido || pedido.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || "Error al emitir la factura");
      } else if (data.yaEmitida) {
        showSuccess("La factura ya estaba emitida.");
        onFacturado();
      } else if (data.emailEnviado) {
        showSuccess(`Factura emitida y enviada a ${pedido.cliente_email}`);
        onFacturado();
      } else if (pedido.cliente_email) {
        showSuccess("Factura emitida, pero no se pudo enviar el correo (revisa los logs).");
        onFacturado();
      } else {
        showSuccess("Factura emitida correctamente");
        onFacturado();
      }
    } catch {
      showError("Error de conexión al emitir la factura");
    } finally {
      setFacturando(null);
    }
  }

  function handleCancelar(pedido: Pedido) {
    setMotivo("02");
    setUuidRelacionado("");
    setCancelModal(pedido);
  }

  async function executeCancelar() {
    if (!cancelModal) return;
    const pedido = cancelModal;
    setCancelando(pedido.id);
    try {
      const res = await fetch("/api/facturacion/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pedido.numero_pedido || pedido.id,
          motivo,
          uuidRelacionado: motivo === "01" ? uuidRelacionado : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || "Error al cancelar la factura");
      } else if (data.estado === "cancelacion_pendiente") {
        showSuccess("Cancelación solicitada: en espera de aceptación del receptor.");
        setCancelModal(null);
        onFacturado();
      } else {
        showSuccess("Factura cancelada correctamente.");
        setCancelModal(null);
        onFacturado();
      }
    } catch {
      showError("Error de conexión al cancelar la factura");
    } finally {
      setCancelando(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 px-3 font-medium text-gray-500 w-[140px]">Pedido</th>
            <th className="py-2 px-3 font-medium text-gray-500">Cliente</th>
            <th className="py-2 px-3 font-medium text-gray-500">Fecha</th>
            <th className="py-2 px-3 font-medium text-gray-500">Total</th>
            <th className="py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">
              Anticipo
            </th>
            <th className="py-2 px-3 font-medium text-gray-500">Pago</th>
            <th className="py-2 px-3 font-medium text-gray-500">Factura</th>
            <th className="py-2 px-3 font-medium text-gray-500 text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => {
            const facturandoEste = facturando === p.id;
            const cancelada = p.factura_estado === "cancelada";
            const pendiente = p.factura_estado === "cancelacion_pendiente";
            return (
              <tr
                key={p.id}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-mono text-xs font-medium">
                  {p.numero_pedido || "\u2014"}
                </td>
                <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-medium">
                  {p.cliente_nombre}
                </td>
                <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs">
                  {formatearFecha(p.fecha_recepcion)}
                </td>
                <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-medium">
                  ${p.total.toFixed(2)}
                </td>
                <td className="py-2 px-3 text-gray-600 hidden sm:table-cell dark:text-gray-400">
                  ${p.anticipo.toFixed(2)}
                </td>
                <td className="py-2 px-3">
                  <Badge color={COLOR_PAGO[p.metodo_pago] || "bg-gray-500"}>
                    {p.metodo_pago}
                  </Badge>
                </td>
                <td className="py-2 px-3">
                  {cancelada ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Cancelada
                    </span>
                  ) : pendiente ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Canc. pendiente
                    </span>
                  ) : p.factura_uuid ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Emitida
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Pendiente
                    </span>
                  )}
                  {p.factura_uuid && (p.factura_folio || p.factura_serie) && (
                    <div className="mt-1 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      {(p.factura_serie || "") + (p.factura_folio || "")}
                    </div>
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/mostrador/ticket/${p.numero_pedido || p.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                      title="Ver ticket"
                    >
                      Ticket
                    </a>
                    {p.factura_uuid ? (
                      <>
                        {p.factura_pdf_url && (
                          <a
                            href={p.factura_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                            title="Descargar factura PDF"
                          >
                            PDF
                          </a>
                        )}
                        {p.factura_xml_url && (
                          <a
                            href={p.factura_xml_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                            title="Ver XML"
                          >
                            XML
                          </a>
                        )}
                        {!cancelada && !pendiente && (
                          <button
                            type="button"
                            onClick={() => handleCancelar(p)}
                            className="text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Cancelar factura"
                          >
                            Cancelar
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleFacturar(p)}
                        disabled={facturandoEste}
                        className="text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50 text-green-600 hover:text-green-800 hover:bg-green-50"
                        title="Emitir factura"
                      >
                        {facturandoEste ? "..." : "Facturar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {pedidos.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-400 dark:text-gray-500">
                No se encontraron pedidos.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {cancelModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => setCancelModal(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <i className="fas fa-triangle-exclamation text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Cancelar factura
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Factura de {cancelModal.cliente_nombre} ({cancelModal.numero_pedido || "—"})
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo de cancelación
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                >
                  {Object.entries(MOTIVOS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {motivo === "01" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    UUID relacionado (folio de sustitución)
                  </label>
                  <input
                    value={uuidRelacionado}
                    onChange={(e) => setUuidRelacionado(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" size="sm" onClick={() => setCancelModal(null)}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={executeCancelar}
                disabled={cancelando === cancelModal.id}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 bg-red-600 hover:bg-red-700"
              >
                {cancelando === cancelModal.id ? "..." : "Sí, cancelar factura"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
