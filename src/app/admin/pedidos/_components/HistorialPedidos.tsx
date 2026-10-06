"use client";

import { useState, useEffect } from "react";
import { useHistorialPedidos } from "@/lib/hooks/useHistorialPedidos";
import { FiltrosPedidos } from "./FiltrosPedidos";
import { TablaPedidos } from "./TablaPedidos";
import { Paginador } from "./Paginador";
import { Button } from "@/components/ui/Button";
import { fetchAtributosConValores } from "@/lib/services/atributos";
import { descargarCSV } from "@/lib/utils/csv";
import type { Atributo, AtributoValor } from "@/lib/supabase/types";

type AtributoConValores = Atributo & { valores: AtributoValor[] };

export function HistorialPedidos() {
  const {
    pedidos,
    cargando,
    error,
    pagina,
    hasMore,
    total,
    porPagina,
    setPorPagina,
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

  function exportar() {
    if (pedidos.length === 0) return;
    const filas = [
      ["Pedido", "Cliente", "Teléfono", "Fecha entrega", "Hora", "Total", "Anticipo", "Pago", "Área", "Estado"],
      ...pedidos.map((p) => [
        p.numero_pedido,
        p.cliente_nombre,
        p.cliente_telefono,
        p.fecha_entrega,
        p.hora_entrega,
        p.total,
        p.anticipo,
        p.metodo_pago,
        p.area_actual,
        p.estado,
      ]),
    ];
    descargarCSV(`pedidos-${new Date().toISOString().slice(0, 10)}.csv`, filas);
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase">
            Pedidos
          </h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={exportar} disabled={pedidos.length === 0}>
              <i className="fas fa-file-csv mr-1" />
              Exportar CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={recargar}>
              Refrescar
            </Button>
          </div>
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
            <TablaPedidos pedidos={pedidos} atributosPool={atributosPool} onEstadoCambiado={recargar} />
            <Paginador
              pagina={pagina}
              hasMore={hasMore}
              total={total}
              porPagina={porPagina}
              onChange={setPagina}
              onPorPaginaChange={setPorPagina}
            />
          </>
        )}
      </div>
    </div>
  );
}
