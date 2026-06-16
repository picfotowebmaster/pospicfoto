"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePedidoStream } from "@/lib/hooks/usePedidoStream";
import { FiltrosProduccion } from "../_components/FiltrosProduccion";
import { TablaProduccion } from "../_components/TablaProduccion";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function TallerPage() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { pedidos, cargando, cambiarEstado } = usePedidoStream([
    "pendiente",
    "en_taller",
  ]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroCorreccion, setFiltroCorreccion] = useState("");

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (
        busqueda &&
        !p.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
        return false;
      if (filtroEstado && p.estado !== filtroEstado) return false;
      if (filtroCorreccion === "si" && !p.requiere_correccion) return false;
      if (filtroCorreccion === "no" && p.requiere_correccion) return false;
      return true;
    });
  }, [pedidos, busqueda, filtroEstado, filtroCorreccion]);

  function actualizarFiltros(nuevos: {
    busqueda?: string;
    estado?: string;
    requiereCorreccion?: string;
  }) {
    if (nuevos.busqueda !== undefined) setBusqueda(nuevos.busqueda);
    if (nuevos.estado !== undefined) setFiltroEstado(nuevos.estado);
    if (nuevos.requiereCorreccion !== undefined)
      setFiltroCorreccion(nuevos.requiereCorreccion);
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("");
    setFiltroCorreccion("");
  }

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

      <div className="max-w-6xl mx-auto p-4">
        {cargando ? (
          <div className="text-center text-gray-400 py-12">Cargando órdenes...</div>
        ) : (
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <FiltrosProduccion
              busqueda={busqueda}
              estado={filtroEstado}
              requiereCorreccion={filtroCorreccion}
              zona="taller"
              onCambiar={actualizarFiltros}
              onLimpiar={limpiarFiltros}
            />
            <TablaProduccion
              pedidos={pedidosFiltrados}
              zona="taller"
              onCambiarEstado={cambiarEstado}
            />
          </div>
        )}
      </div>
    </div>
  );
}
