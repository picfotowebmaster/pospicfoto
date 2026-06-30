"use client";

import { useState, useEffect } from "react";
import { useHistorialPedidos } from "@/lib/hooks/useHistorialPedidos";
import { FiltrosPedidos } from "./FiltrosPedidos";
import { TablaPedidos } from "./TablaPedidos";
import { Paginador } from "./Paginador";
import { Button } from "@/components/ui/Button";
import { fetchAtributosConValores } from "@/lib/services/atributos";
import type { Atributo, AtributoValor } from "@/lib/supabase/types";

type AtributoConValores = Atributo & { valores: AtributoValor[] };

export function HistorialPedidos() {
  const {
    pedidos,
    cargando,
    error,
    pagina,
    hasMore,
    setPagina,
    filtros,
    actualizarFiltros,
    limpiarFiltros,
    recargar,
  } = useHistorialPedidos();

  const [atributosPool, setAtributosPool] = useState<AtributoConValores[]>([]);

  useEffect(() => {
    fetchAtributosConValores()
      .then((data) => setAtributosPool(data as AtributoConValores[]))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-gray-700 text-sm uppercase">
            Pedidos
          </h2>
          <Button size="sm" variant="ghost" onClick={recargar}>
            Refrescar
          </Button>
        </div>

        <FiltrosPedidos
          busqueda={filtros.busqueda ?? ""}
          ticketId={filtros.ticketId ?? ""}
          estado={filtros.estado ?? ""}
          metodoPago={filtros.metodoPago ?? ""}
          fechaDesde={filtros.fechaDesde ?? ""}
          fechaHasta={filtros.fechaHasta ?? ""}
          requiereCorreccion={filtros.requiereCorreccion ?? ""}
          areaActual={filtros.areaActual ?? ""}
          onCambiar={actualizarFiltros}
          onLimpiar={limpiarFiltros}
        />

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {cargando ? (
          <div className="text-gray-400 text-sm text-center py-8">
            Cargando pedidos...
          </div>
        ) : (
          <>
            <TablaPedidos pedidos={pedidos} atributosPool={atributosPool} onEstadoCambiado={recargar} />
            <Paginador
              pagina={pagina}
              hasMore={hasMore}
              onChange={setPagina}
            />
          </>
        )}
      </div>
    </div>
  );
}
