"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import {
  TicketTemplate,
  type TicketPedido,
} from "@/components/ui/TicketTemplate";
import type { EntidadEmisora } from "@/lib/supabase/types";

interface OfflineTicketProps {
  pedido: TicketPedido;
  emisor: EntidadEmisora | null;
  onClose: () => void;
}

export function OfflineTicket({ pedido, emisor, onClose }: OfflineTicketProps) {
  return (
    <div className="ticket-page min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="mb-4 flex flex-wrap justify-center gap-2 no-print">
        <Button size="sm" variant="primary" onClick={() => window.print()}>
          <i className="fas fa-print mr-1" />
          Imprimir
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <i className="fas fa-arrow-left mr-1" />
          Regresar
        </Button>
      </div>

      <div className="mb-4 w-full max-w-[72mm] no-print bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 text-center">
        Pedido guardado sin conexión. Se sincronizará automáticamente cuando
        vuelva el internet.
      </div>

      <div className="ticket-print-area">
        <TicketTemplate
          pedido={pedido}
          emisor={emisor}
          nota="PEDIDO SIN CONEXIÓN · FOLIO PENDIENTE DE SINCRONIZAR"
        />
      </div>
    </div>
  );
}
