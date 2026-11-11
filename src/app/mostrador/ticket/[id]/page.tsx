"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TicketTemplate } from "@/components/ui/TicketTemplate";
import { fetchPedido, liquidarSaldo } from "@/lib/services/pedidos";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { LiquidarSaldoModal } from "@/app/mostrador/_components/LiquidarSaldoModal";
import { pedidoPagado } from "@/lib/utils/fiscal";
import { fetchEntidadesPorIds } from "@/lib/services/entidadesEmisoras";
import { facturacionHabilitada } from "@/lib/config/features";
import type {
  EntidadEmisora,
  MetodoPago,
  Pedido,
} from "@/lib/supabase/types";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [emisores, setEmisores] = useState<Map<string, EntidadEmisora>>(
    new Map(),
  );
  const [cargando, setCargando] = useState(true);
  const [facturando, setFacturando] = useState(false);
  const [enviandoTicket, setEnviandoTicket] = useState(false);
  const [liquidando, setLiquidando] = useState(false);
  const [facturaInfo, setFacturaInfo] = useState<{
    uuid: string;
    pdfUrl: string | null;
    xmlUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const principal = await fetchPedido(id);
        if (principal.factura_numero && principal.factura_numero !== principal.numero_pedido) {
          const { data } = await supabase
            .from("pedidos")
            .select("*, detalle_pedidos(*)")
            .eq("factura_numero", principal.factura_numero)
            .order("created_at", { ascending: true });
          setPedidos((data ?? []) as Pedido[]);
        } else {
          setPedidos([principal]);
        }
      } catch {
        try {
          const { data } = await supabase
            .from("pedidos")
            .select("*, detalle_pedidos(*)")
            .eq("factura_numero", id)
            .order("created_at", { ascending: true });
          if (data && data.length > 0) {
            setPedidos(data as Pedido[]);
          } else {
            setPedidos([]);
          }
        } catch {
          setPedidos([]);
        }
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    const ids = pedidos
      .map((pedido) => pedido.entidad_emisora_id)
      .filter((id): id is string => Boolean(id));

    if (ids.length === 0) return;

    fetchEntidadesPorIds(ids)
      .then(setEmisores)
      .catch(() => {});
  }, [pedidos]);

  async function handleEnviarTicket() {
    const pedido = pedidos[0];
    if (!pedido) return;
    if (!pedido.cliente_email) {
      showError("El pedido no tiene correo del cliente.");
      return;
    }
    setEnviandoTicket(true);
    try {
      const res = await fetch("/api/ticket/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pedido.numero_pedido || pedido.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || "Error al enviar el ticket");
      } else {
        showSuccess(`Ticket enviado a ${pedido.cliente_email}`);
      }
    } catch {
      showError("Error de conexión al enviar el ticket");
    } finally {
      setEnviandoTicket(false);
    }
  }

  async function handleFacturar() {
    setFacturando(true);
    try {
      const res = await fetch("/api/facturacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || "Error al emitir la factura");
      } else {
        setFacturaInfo({
          uuid: data.uuid,
          pdfUrl: data.pdfUrl ?? null,
          xmlUrl: data.xmlUrl ?? null,
        });
        showSuccess("Factura emitida correctamente");
      }
    } catch {
      showError("Error de conexión al emitir la factura");
    } finally {
      setFacturando(false);
    }
  }

  const uuidActual =
    pedidos[0]?.factura_uuid || facturaInfo?.uuid || null;
  const pdfUrlActual =
    pedidos[0]?.factura_pdf_url || facturaInfo?.pdfUrl || null;
  const xmlUrlActual =
    pedidos[0]?.factura_xml_url || facturaInfo?.xmlUrl || null;

  const pedidoPrincipal = pedidos[0];
  const pagado = pedidoPrincipal ? pedidoPagado(pedidoPrincipal) : false;
  const requiereFactura = Boolean(pedidoPrincipal?.requiere_factura);
  const tieneRfc = Boolean(pedidoPrincipal?.cliente_rfc);
  const enGlobal = Boolean(pedidoPrincipal?.factura_global_id);
  const saldoPendiente = pedidoPrincipal
    ? Math.max(0, pedidoPrincipal.total - pedidoPrincipal.anticipo)
    : 0;
  const puedeLiquidar =
    pedidos.length === 1 &&
    Boolean(pedidoPrincipal) &&
    pedidoPrincipal?.estado !== "cancelado" &&
    !pedidoPrincipal?.saldo_cobrado &&
    saldoPendiente > 0.01;

  async function handleLiquidar(metodo: MetodoPago) {
    if (!pedidoPrincipal) return;
    await liquidarSaldo(pedidoPrincipal.id, metodo);

    const ahora = new Date().toISOString();
    setPedidos((prev) =>
      prev.map((pedido) =>
        pedido.id === pedidoPrincipal.id
          ? {
              ...pedido,
              saldo_cobrado: true,
              saldo_metodo_pago: metodo,
              saldo_cobrado_en: ahora,
              fecha_pago_total: ahora,
            }
          : pedido,
      ),
    );
    setLiquidando(false);
    showSuccess("Saldo liquidado. Ticket actualizado.");
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Cargando ticket...</p>
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Ticket no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="ticket-page min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="mb-4 flex flex-wrap gap-2 no-print">
        <Button
          size="sm"
          variant="primary"
          onClick={() => window.print()}
        >
          <i className="fas fa-print mr-1" />
          Imprimir
        </Button>
        {puedeLiquidar && (
          <Button
            size="sm"
            variant="success"
            onClick={() => setLiquidando(true)}
          >
            <i className="fas fa-hand-holding-dollar mr-1" />
            Liquidar
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleEnviarTicket}
          disabled={enviandoTicket}
        >
          {enviandoTicket ? "Enviando..." : "Enviar Ticket"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.push("/mostrador")}
        >
          <i className="fas fa-arrow-left mr-1" />
          Regresar
        </Button>
      </div>

      {pedidos.length === 1 &&
        saldoPendiente > 0.01 &&
        pedidoPrincipal?.estado !== "cancelado" && (
          <div className="mb-4 w-full max-w-[72mm] no-print">
            {pedidoPrincipal?.saldo_cobrado ? (
              <p className="text-center text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <i className="fas fa-check-circle mr-1" />
                Pagado. Puedes imprimir el ticket actualizado.
              </p>
            ) : (
              <p className="text-center text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Pendiente: ${saldoPendiente.toFixed(2)}
              </p>
            )}
          </div>
        )}

      {(facturacionHabilitada() || uuidActual) && (
      <div className="mb-4 w-full max-w-[72mm] no-print flex flex-col gap-2">
        {uuidActual ? (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-center text-sm">
            <p className="font-semibold text-green-800">
              <i className="fas fa-check-circle mr-1" />
              Factura emitida
            </p>
            <p className="font-mono text-xs text-green-700 break-all mt-1">
              UUID: {uuidActual}
            </p>
            <div className="flex justify-center gap-2 mt-2">
              {pdfUrlActual && (
                <a
                  href={pdfUrlActual}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline text-xs font-medium"
                >
                  Descargar PDF
                </a>
              )}
              {xmlUrlActual && (
                <a
                  href={xmlUrlActual}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline text-xs font-medium"
                >
                  Ver XML
                </a>
              )}
            </div>
          </div>
        ) : enGlobal ? (
          <p className="text-center text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            Este pedido ya está incluido en la factura global mensual.
          </p>
        ) : !requiereFactura ? (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            Sin factura individual. El pedido se incluirá en la factura global mensual.
          </p>
        ) : !pagado ? (
          <p className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Factura pendiente: se podrá emitir cuando el pedido esté pagado en su totalidad.
          </p>
        ) : !tieneRfc ? (
          <p className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Falta el RFC del comprador para emitir la factura individual.
          </p>
        ) : (
          <Button
            size="md"
            variant="success"
            onClick={handleFacturar}
            disabled={facturando}
          >
            {facturando ? "Emitiendo factura..." : "Facturar (CFDI)"}
          </Button>
        )}
      </div>
      )}
      <div className="ticket-print-area">
        {pedidos.length === 1 ? (
          <TicketTemplate
            pedido={pedidos[0]}
            emisor={
              pedidos[0].entidad_emisora_id
                ? emisores.get(pedidos[0].entidad_emisora_id) ?? null
                : null
            }
          />
        ) : (
          <div>
            <div className="ticket-container max-w-[72mm] mx-auto font-mono text-[10px] leading-tight text-black bg-white mb-4">
              <div className="text-center p-2 border border-dashed border-gray-400 rounded">
                <div className="font-bold text-xs">FACTURA: {id}</div>
                <div className="text-[8px] text-gray-500 mt-1">
                  Esta factura contiene {pedidos.length} pedidos con rutas de producción distintas.
                </div>
              </div>
            </div>
            {pedidos.map((p, i) => (
              <div key={p.id}>
                {i > 0 && <div className="border-t-4 border-dashed border-gray-300 my-4 max-w-[72mm] mx-auto" />}
                <TicketTemplate
                  pedido={p}
                  emisor={
                    p.entidad_emisora_id
                      ? emisores.get(p.entidad_emisora_id) ?? null
                      : null
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {liquidando && pedidoPrincipal && (
        <LiquidarSaldoModal
          numeroPedido={pedidoPrincipal.numero_pedido}
          clienteNombre={pedidoPrincipal.cliente_nombre}
          saldo={saldoPendiente}
          onConfirm={handleLiquidar}
          onClose={() => setLiquidando(false)}
        />
      )}
    </div>
  );
}
