"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { TicketTemplate } from "@/components/ui/TicketTemplate";
import { fetchPedido } from "@/lib/services/pedidos";
import { supabase } from "@/lib/supabase/client";
import { useThermalPrinter } from "@/lib/hooks/useThermalPrinter";
import { ThermalPrintButton } from "@/app/_components/ThermalPrintButton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Pedido } from "@/lib/supabase/types";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { signOut } = useAuth();
  const { showError, showSuccess } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [autoPrintDone, setAutoPrintDone] = useState(false);
  const [facturando, setFacturando] = useState(false);
  const [facturaInfo, setFacturaInfo] = useState<{
    uuid: string;
    pdfUrl: string | null;
    xmlUrl: string | null;
  } | null>(null);

  const printer = useThermalPrinter();

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
    if (pedidos.length > 0 && !cargando && !autoPrintDone) {
      setTimeout(() => {
        window.print();
        setAutoPrintDone(true);
      }, 300);
    }
  }, [pedidos, cargando, autoPrintDone]);

  const handleThermalPrint = useCallback(() => {
    for (const pedido of pedidos) {
      const lineas = (pedido.detalle_pedidos ?? []).map((d) => ({
        nombre: d.producto_nombre,
        cantidad: d.cantidad,
        importe: d.importe_linea,
        atributos: d.atributos as Record<string, string> | undefined,
      }));

      printer.print({
        numeroPedido: pedido.numero_pedido || pedido.id.slice(0, 8).toUpperCase(),
        cliente: pedido.cliente_nombre,
        telefono: pedido.cliente_telefono || undefined,
        fechaRecepcion: pedido.fecha_recepcion,
        horaRecepcion: pedido.hora_recepcion || "00:00",
        fechaEntrega: pedido.fecha_entrega,
        horaEntrega: pedido.hora_entrega,
        metodoPago: pedido.metodo_pago,
        subtotal: pedido.subtotal,
        anticipo: pedido.anticipo,
        total: pedido.total,
        lineas,
      });
    }
  }, [pedidos, printer]);

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
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="mb-4 flex gap-2 no-print">
        <ThermalPrintButton
          status={printer.status}
          error={printer.error}
          deviceName={printer.deviceName}
          bluetoothAvailable={printer.bluetoothAvailable}
          onConnect={printer.connect}
          onPrint={handleThermalPrint}
          onDisconnect={printer.disconnect}
          onRetry={printer.retry}
          onBrowserPrint={() => window.print()}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.push("/mostrador")}
        >
          Mostrador
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={signOut}
        >
          Salir
        </Button>
      </div>

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
      {pedidos.length === 1 ? (
        <TicketTemplate pedido={pedidos[0]} />
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
              <TicketTemplate pedido={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
