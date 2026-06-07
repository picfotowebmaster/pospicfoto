"use client";

import React from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePedidoStream } from "@/lib/hooks/usePedidoStream";
import { ColaPedidos } from "../_components/ColaPedidos";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function TallerPage() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { pedidos, cargando, cambiarEstado } = usePedidoStream([
    "pendiente",
    "en_taller",
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">PIC PHOTO - TALLER</h1>
          <p className="text-xs text-gray-500">Órdenes de Producción</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {session?.user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={() => router.push("/produccion/corte")}>
            Corte
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Salir
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4">
        {cargando ? (
          <div className="text-center text-gray-400 py-12">Cargando órdenes...</div>
        ) : (
          <ColaPedidos
            pedidos={pedidos}
            zona="taller"
            onCambiarEstado={cambiarEstado}
          />
        )}
      </div>
    </div>
  );
}
