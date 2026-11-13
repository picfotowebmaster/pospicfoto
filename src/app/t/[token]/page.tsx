import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TicketTemplate } from "@/components/ui/TicketTemplate";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  esTokenValido,
  obtenerEnlaceValido,
} from "@/lib/services/enlacesCompartidos";
import type { EntidadEmisora, Pedido } from "@/lib/supabase/types";
import { BotonImprimir } from "./BotonImprimir";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://pos.picfoto.mx";

const TITULO = "Ticket PIC FOTO";
const DESCRIPCION = "Consulta tu ticket en línea de PIC FOTO.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: TITULO,
  description: DESCRIPCION,
  openGraph: {
    type: "website",
    siteName: "PIC FOTO",
    locale: "es_MX",
    title: TITULO,
    description: DESCRIPCION,
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "PIC FOTO",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: TITULO,
    description: DESCRIPCION,
    images: ["/icons/icon-512.png"],
  },
};

export default async function TicketPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!esTokenValido(token)) notFound();

  let enlace;
  try {
    enlace = await obtenerEnlaceValido(token);
  } catch {
    notFound();
  }

  if (!enlace) notFound();

  const admin = createAdminClient();

  const { data: principal } = await admin
    .from("pedidos")
    .select("*, detalle_pedidos(*)")
    .eq("id", enlace.pedido_id)
    .maybeSingle();

  if (!principal) notFound();

  const pedido = principal as unknown as Pedido;
  let pedidos: Pedido[] = [pedido];

  if (
    pedido.factura_numero &&
    pedido.factura_numero !== pedido.numero_pedido
  ) {
    const { data } = await admin
      .from("pedidos")
      .select("*, detalle_pedidos(*)")
      .eq("factura_numero", pedido.factura_numero)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      pedidos = data as unknown as Pedido[];
    }
  }

  let emisor: EntidadEmisora | null = null;
  if (pedido.entidad_emisora_id) {
    const { data } = await admin
      .from("entidades_emisoras")
      .select("*")
      .eq("id", pedido.entidad_emisora_id)
      .maybeSingle();

    emisor = (data as EntidadEmisora) ?? null;
  }

  const pdfUrl = pedido.factura_pdf_url;
  const xmlUrl = pedido.factura_xml_url;

  return (
    <div className="ticket-page min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="mb-4 flex flex-wrap gap-2 no-print">
        <BotonImprimir />
      </div>

      {(pdfUrl || xmlUrl) && (
        <div className="mb-4 w-full max-w-[72mm] no-print bg-green-50 border border-green-300 rounded-lg p-3 text-center text-sm">
          <p className="font-semibold text-green-800">Factura disponible</p>
          <div className="flex justify-center gap-3 mt-2">
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline text-xs font-medium"
              >
                Descargar PDF
              </a>
            )}
            {xmlUrl && (
              <a
                href={xmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline text-xs font-medium"
              >
                Ver XML
              </a>
            )}
          </div>
        </div>
      )}

      <div className="ticket-print-area">
        {pedidos.length === 1 ? (
          <TicketTemplate pedido={pedidos[0]} emisor={emisor} />
        ) : (
          <div>
            <div className="ticket-container max-w-[72mm] mx-auto font-mono text-[10px] leading-tight text-black bg-white mb-4">
              <div className="text-center p-2 border border-dashed border-gray-400 rounded">
                <div className="font-bold text-xs">
                  FACTURA: {pedido.factura_numero}
                </div>
                <div className="text-[8px] text-gray-500 mt-1">
                  Esta factura contiene {pedidos.length} pedidos.
                </div>
              </div>
            </div>
            {pedidos.map((p, i) => (
              <div key={p.id}>
                {i > 0 && (
                  <div className="border-t-4 border-dashed border-gray-300 my-4 max-w-[72mm] mx-auto" />
                )}
                <TicketTemplate
                  pedido={p}
                  emisor={
                    p.entidad_emisora_id === pedido.entidad_emisora_id
                      ? emisor
                      : null
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
