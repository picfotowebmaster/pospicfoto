"use client";

import { useHistorialPedidos } from "@/lib/hooks/useHistorialPedidos";
import { FiltrosPedidos } from "@/app/admin/pedidos/_components/FiltrosPedidos";
import { Paginador } from "@/app/admin/pedidos/_components/Paginador";
import { Button } from "@/components/ui/Button";
import { FacturasTable } from "./_components/FacturasTable";

export default function FacturasPage() {
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

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase">
            Facturación
          </h2>
          <Button size="sm" variant="ghost" onClick={recargar}>
            Refrescar
          </Button>
        </div>

        <FiltrosPedidos
          busqueda={filtros.busqueda ?? ""}
          numeroPedido={filtros.numeroPedido ?? ""}
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
          <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
            Cargando pedidos...
          </div>
        ) : (
          <>
            <FacturasTable pedidos={pedidos} onFacturado={recargar} />
            <Paginador pagina={pagina} hasMore={hasMore} onChange={setPagina} />
          </>
        )}
      </div>
    </div>
  );
}
