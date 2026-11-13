"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/Toast";
import { FiltrosPedidos } from "@/app/admin/pedidos/_components/FiltrosPedidos";
import { Paginador } from "@/app/admin/pedidos/_components/Paginador";
import { LiquidarSaldoModal } from "@/app/mostrador/_components/LiquidarSaldoModal";
import { ModalCancelarPedido } from "@/components/pedidos/ModalCancelarPedido";
import { useHistorialPedidos } from "@/lib/hooks/useHistorialPedidos";
import { useAuth } from "@/lib/hooks/useAuth";
import { liquidarSaldo } from "@/lib/services/pedidos";
import { vendedoresParaFiltro } from "@/lib/services/vendedores";
import { ESTADOS_PEDIDO } from "@/lib/utils/constantes";
import {
  puedeCancelarPedido,
  type MotivoCancelacionPedido,
} from "@/lib/utils/cancelacion";
import { cancelarVenta } from "@/lib/services/pedidos";
import type { MetodoPago, Pedido } from "@/lib/supabase/types";

function formatearFecha(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00`);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function EstadoBadge({ estado }: { estado: string }) {
  const def = ESTADOS_PEDIDO.find((e) => e.value === estado);
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        def?.color ?? "bg-gray-500"
      } text-white`}
    >
      {def?.label ?? estado}
    </span>
  );
}

export default function PedidosMostradorPage() {
  const router = useRouter();
  const { session, profile, perfilCargando } = useAuth();
  const { showSuccess } = useToast();
  const verTodos = profile?.rol === "admin" || profile?.rol === "superadmin";
  const restringir = !verTodos;
  const sinSucursal =
    !perfilCargando && restringir && !profile?.sucursal_id;
  const habilitado = !perfilCargando && !sinSucursal;
  const [liquidando, setLiquidando] = useState<Pedido | null>(null);
  const [cancelando, setCancelando] = useState<Pedido | null>(null);
  const {
    pedidos,
    vendedores,
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
  } = useHistorialPedidos({
    sucursalFijo: restringir ? profile?.sucursal_id : undefined,
    habilitado,
  });

  async function confirmarLiquidacion(metodo: MetodoPago) {
    if (!liquidando) return;
    const numero = liquidando.numero_pedido || liquidando.id;
    await liquidarSaldo(liquidando.id, metodo, session?.user.id ?? null);
    setLiquidando(null);
    showSuccess("Saldo liquidado. Ticket actualizado.");
    router.push(`/mostrador/ticket/${numero}`);
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={32} className="shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Pedidos
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Busca un pedido y abre su ticket
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={recargar}>
            <i className="fas fa-sync-alt mr-1" />
            Refrescar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push("/mostrador")}
          >
            <i className="fas fa-arrow-left mr-1" />
            Regresar
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-4">
          <FiltrosPedidos
            busqueda={filtros.busqueda ?? ""}
            numeroPedido={filtros.numeroPedido ?? ""}
            estado={filtros.estado ?? ""}
            metodoPago={filtros.metodoPago ?? ""}
            vendedorId={filtros.vendedorId ?? ""}
            vendedores={vendedoresParaFiltro(vendedores)}
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

          {sinSucursal ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm rounded-lg px-4 py-3">
              No tienes una sucursal asignada. Contacta al administrador para
              poder consultar los pedidos de tu sucursal.
            </div>
          ) : cargando ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
              Cargando pedidos...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 px-3 font-medium text-gray-500">
                        Pedido
                      </th>
                      <th className="py-2 px-3 font-medium text-gray-500">
                        Cliente
                      </th>
                      <th className="py-2 px-3 font-medium text-gray-500 hidden md:table-cell">
                        Teléfono
                      </th>
                      <th className="py-2 px-3 font-medium text-gray-500">
                        Entrega
                      </th>
                      <th className="py-2 px-3 font-medium text-gray-500">
                        Total
                      </th>
                      <th className="py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">
                        Anticipo
                      </th>
                      <th className="py-2 px-3 font-medium text-gray-500">
                        Estado de pago
                      </th>
                      <th className="py-2 px-3 font-medium text-gray-500">
                        Estado
                      </th>
                      <th className="py-2 px-3 font-medium text-gray-500 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((p) => {
                      const saldo = Math.max(0, p.total - p.anticipo);
                      const saldoPagado = Boolean(p.saldo_cobrado) || saldo <= 0.01;
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                        >
                          <td className="py-2 px-3 font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
                            {p.numero_pedido || "\u2014"}
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-medium">
                            {p.cliente_nombre}
                          </td>
                          <td className="py-2 px-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                            {p.cliente_telefono || "\u2014"}
                          </td>
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300 text-xs">
                            <div>{formatearFecha(p.fecha_entrega)}</div>
                            <div className="text-gray-400 dark:text-gray-500">
                              {p.hora_entrega.slice(0, 5)}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-medium">
                            ${p.total.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                            ${p.anticipo.toFixed(2)}
                          </td>
                          <td className="py-2 px-3">
                            {p.estado === "cancelado" ? (
                              <span className="text-xs text-gray-400">
                                Cancelado
                              </span>
                            ) : saldoPagado ? (
                              <Badge color="bg-emerald-500">Liquidado</Badge>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <Badge color="bg-amber-500">Pendiente</Badge>
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                  ${saldo.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <EstadoBadge estado={p.estado} />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!saldoPagado && p.estado !== "cancelado" && (
                                <button
                                  type="button"
                                  onClick={() => setLiquidando(p)}
                                  className="text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                  title="Liquidar saldo"
                                >
                                  Liquidar
                                </button>
                              )}
                              {puedeCancelarPedido(p, {
                                rol: profile?.rol ?? null,
                                sucursal_id: profile?.sucursal_id ?? null,
                              }).permitido && (
                                <button
                                  type="button"
                                  onClick={() => setCancelando(p)}
                                  className="text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer font-medium text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  title="Cancelar venta"
                                >
                                  Cancelar
                                </button>
                              )}
                              <a
                                href={`/mostrador/ticket/${p.numero_pedido || p.id}`}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <i className="fas fa-print mr-1" />
                                Ver ticket
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {pedidos.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 text-center text-gray-400 dark:text-gray-500"
                        >
                          No se encontraron pedidos.
                        </td>
                      </tr>
                    )}
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
              />
            </>
          )}
        </div>
      </div>

      <ModalCancelarPedido
        pedido={cancelando}
        perfil={{ rol: profile?.rol ?? null, sucursal_id: profile?.sucursal_id ?? null }}
        onClose={() => setCancelando(null)}
        onConfirm={async ({
          motivo,
          notas,
        }: {
          motivo: MotivoCancelacionPedido;
          notas: string;
        }) => {
          if (!cancelando) return;
          await cancelarVenta(cancelando.id, { motivo, notas });
          setCancelando(null);
          showSuccess("Venta cancelada.");
          recargar();
        }}
      />

      {liquidando && (
        <LiquidarSaldoModal
          numeroPedido={liquidando.numero_pedido}
          clienteNombre={liquidando.cliente_nombre}
          saldo={Math.max(0, liquidando.total - liquidando.anticipo)}
          onConfirm={confirmarLiquidacion}
          onClose={() => setLiquidando(null)}
        />
      )}
    </div>
  );
}
