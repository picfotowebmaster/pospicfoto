"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Paginador } from "@/app/admin/pedidos/_components/Paginador";
import { useClientesAdmin } from "@/lib/hooks/useClientesAdmin";
import type { Cliente } from "@/lib/supabase/types";
import { ClienteComprasModal } from "./ClienteComprasModal";
import { EditarClienteModal } from "./EditarClienteModal";

const formatoMoneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function fechaLegible(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  return formatoFecha.format(new Date(fecha));
}

export function ClientesAdmin() {
  const {
    clientes,
    busqueda,
    setBusqueda,
    pagina,
    setPagina,
    porPagina,
    setPorPagina,
    total,
    cargando,
    error,
    recargar,
    hasMore,
  } = useClientesAdmin();

  const [clienteCompras, setClienteCompras] = useState<Cliente | null>(null);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase">
            Clientes
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, teléfono o correo..."
                aria-label="Buscar clientes"
                className="w-72 max-w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button size="sm" variant="ghost" onClick={recargar}>
              Refrescar
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {cargando ? (
          <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
            Cargando clientes...
          </div>
        ) : clientes.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
            {busqueda.trim()
              ? "No se encontraron clientes con esa búsqueda."
              : "Aún no hay clientes registrados."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    <th className="py-2 pr-3 font-medium">Contacto</th>
                    <th className="py-2 pr-3 font-medium text-right">Pedidos</th>
                    <th className="py-2 pr-3 font-medium text-right">
                      Total gastado
                    </th>
                    <th className="py-2 pr-3 font-medium">Última compra</th>
                    <th className="py-2 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {clientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {cliente.nombre}
                        </p>
                        {cliente.rfc && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {cliente.rfc}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                        <p>{cliente.telefono || "Sin teléfono"}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {cliente.email || "Sin correo"}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 text-right text-gray-700 dark:text-gray-300">
                        {Number(cliente.pedidos_count ?? 0)}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatoMoneda.format(
                          Number(cliente.total_gastado ?? 0),
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {fechaLegible(cliente.last_order_at)}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setClienteCompras(cliente)}
                            className="px-2 py-1 text-xs font-medium rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                          >
                            <i className="fas fa-receipt mr-1" />
                            Compras
                          </button>
                          <button
                            type="button"
                            onClick={() => setClienteEditando(cliente)}
                            className="px-2 py-1 text-xs font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            <i className="fas fa-pen mr-1" />
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Paginador
              pagina={pagina}
              hasMore={hasMore}
              total={total}
              porPagina={porPagina}
              onChange={setPagina}
              onPorPaginaChange={setPorPagina}
              etiqueta="cliente"
            />
          </>
        )}
      </div>

      <ClienteComprasModal
        key={`compras-${clienteCompras?.id ?? "sin-cliente"}`}
        cliente={clienteCompras}
        onClose={() => setClienteCompras(null)}
      />

      <EditarClienteModal
        key={`editar-${clienteEditando?.id ?? "sin-cliente"}`}
        cliente={clienteEditando}
        onClose={() => setClienteEditando(null)}
        onGuardado={() => {
          setClienteEditando(null);
          recargar();
        }}
      />
    </div>
  );
}
