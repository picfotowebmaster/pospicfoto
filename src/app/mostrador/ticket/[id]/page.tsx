"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { TicketTemplate } from "@/components/ui/TicketTemplate";
import { fetchPedido } from "@/lib/services/pedidos";
import { Button } from "@/components/ui/Button";
import type { Pedido } from "@/lib/supabase/types";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { signOut } = useAuth();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPedido(id)
        .then(setPedido)
        .catch(console.error)
        .finally(() => setCargando(false));
    }
  }, [id]);

  useEffect(() => {
    if (pedido && !cargando) {
      setTimeout(() => window.print(), 300);
    }
  }, [pedido, cargando]);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Cargando ticket...</p>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Ticket no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="mb-4 flex gap-2 no-print">
        <Button size="sm" onClick={() => window.print()}>
          🖨️ Imprimir
        </Button>
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
      <TicketTemplate pedido={pedido} />
    </div>
  );
}
