"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/hooks/useAuth";
import { useReportesContables } from "@/lib/hooks/useReportesContables";
import { descargarCSV } from "@/lib/utils/csv";
import { etiquetaVendedor } from "@/lib/services/vendedores";
import { METODOS_PAGO, NOMBRE_EMPRESA } from "@/lib/utils/constantes";
import {
  ETIQUETAS_PERIODO,
  type PeriodoKey,
} from "@/lib/utils/periodos";
import {
  filasMovimientosContables,
  filasResumenContable,
} from "@/lib/utils/reportesContablesCsv";

const VentasChart = dynamic(
  () =>
    import("@/app/admin/reportes/_components/VentasChart").then((m) => ({
      default: m.VentasChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    ),
  },
);

const MetodoPagoChart = dynamic(
  () =>
    import("@/app/admin/reportes/_components/MetodoPagoChart").then((m) => ({
      default: m.MetodoPagoChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    ),
  },
);

interface ReportesContablesProps {
  rol: string;
  puedeVerTodo: boolean;
  usuarioId: string;
  usuarioNombre: string;
}

const PERIODOS: PeriodoKey[] = ["hoy", "semana", "mes", "anio", "personalizado"];

const formatoMoneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function rutaInicio(rol: string): string {
  if (rol === "admin" || rol === "superadmin") return "/admin";
  if (rol === "contador") return "/contabilidad";
  if (rol !== "mostrador") return "/produccion/kanban";
  return "/mostrador";
}

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ReportesContables({
  rol,
  puedeVerTodo,
  usuarioId,
  usuarioNombre,
}: ReportesContablesProps) {
  const { signOut } = useAuth();
  const {
    periodo,
    setPeriodo,
    desdeCustom,
    setDesdeCustom,
    hastaCustom,
    setHastaCustom,
    metodoPago,
    setMetodoPago,
    vendedorId,
    setVendedorId,
    vendedores,
    rango,
    rangoValido,
    reporte,
    cargando,
    error,
    recargar,
  } = useReportesContables(puedeVerTodo ? undefined : usuarioId);

  const datosVentas = useMemo(
    () =>
      reporte.porDia.map((dia) => ({
        fecha_recepcion: dia.fecha,
        count: dia.pedidos,
        total: dia.vendido,
      })),
    [reporte.porDia],
  );

  const datosCobrado = useMemo(
    () =>
      reporte.porDia.map((dia) => ({
        fecha_recepcion: dia.fecha,
        count: 0,
        total: dia.cobrado,
      })),
    [reporte.porDia],
  );

  const meta = {
    desde: rango.desde,
    hasta: rango.hasta,
    metodoPago,
    vendedor: puedeVerTodo
      ? vendedorId === "sin_vendedor"
        ? "Sin vendedor"
        : (() => {
            const vendedor = vendedores.find(
              (item) => item.id === vendedorId,
            );
            return vendedor ? etiquetaVendedor(vendedor) : "Todos";
          })()
      : usuarioNombre || "Mis ventas",
  };

  function exportarResumen() {
    descargarCSV(
      `reporte-contable-resumen-${rango.desde}-${rango.hasta}.csv`,
      filasResumenContable(reporte, meta),
    );
  }

  function exportarMovimientos() {
    const metodo = metodoPago ? `-${slug(metodoPago)}` : "";
    descargarCSV(
      `reporte-contable-movimientos${metodo}-${rango.desde}-${rango.hasta}.csv`,
      filasMovimientosContables(reporte.movimientos, meta),
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={32} className="shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {NOMBRE_EMPRESA} - Reportes contables
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Descarga de ventas, cobros y movimientos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={rutaInicio(rol)}>
            <Button variant="ghost" size="sm">
              <i className="fas fa-arrow-left mr-1.5" />
              Volver
            </Button>
          </Link>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={signOut}>
            Salir
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase">
                {puedeVerTodo ? "Reportes contables" : "Descargar reporte"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {puedeVerTodo
                  ? "Ventas, cobros y saldos del periodo seleccionado."
                  : "Selecciona el periodo y descarga el archivo CSV."}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={recargar}>
              Refrescar
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {PERIODOS.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setPeriodo(opcion)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    periodo === opcion
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {ETIQUETAS_PERIODO[opcion]}
                </button>
              ))}
            </div>

            <div>
              <label
                htmlFor="reporte-metodo-pago"
                className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
              >
                Método de pago
              </label>
              <select
                id="reporte-metodo-pago"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {METODOS_PAGO.map((metodo) => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </option>
                ))}
              </select>
            </div>

            {puedeVerTodo && (
              <div>
                <label
                  htmlFor="reporte-vendedor"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                >
                  Vendedor
                </label>
                <select
                  id="reporte-vendedor"
                  value={vendedorId}
                  onChange={(e) => setVendedorId(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {etiquetaVendedor(vendedor)}
                    </option>
                  ))}
                  <option value="sin_vendedor">Sin vendedor</option>
                </select>
              </div>
            )}
          </div>

          {periodo === "personalizado" && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="reporte-desde"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                >
                  Desde
                </label>
                <input
                  id="reporte-desde"
                  type="date"
                  value={desdeCustom}
                  onChange={(e) => setDesdeCustom(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="reporte-hasta"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                >
                  Hasta
                </label>
                <input
                  id="reporte-hasta"
                  type="date"
                  value={hastaCustom}
                  onChange={(e) => setHastaCustom(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {!rangoValido && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Elige un rango de fechas válido.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Periodo: {rango.desde} a {rango.hasta}
            {metodoPago ? ` · Método: ${metodoPago}` : ""}
            {!puedeVerTodo && usuarioNombre
              ? ` · Vendedor: ${usuarioNombre}`
              : vendedorId && meta.vendedor !== "Todos"
                ? ` · Vendedor: ${meta.vendedor}`
                : ""}
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {!rangoValido ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
              Selecciona un rango de fechas válido para generar el reporte.
            </div>
          ) : cargando ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
              Cargando reporte...
            </div>
          ) : (
            <>
              {puedeVerTodo && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Vendido
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {formatoMoneda.format(reporte.totalVendido)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Cobrado
                      </p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">
                        {formatoMoneda.format(reporte.totalCobrado)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Saldo pendiente
                      </p>
                      <p className="text-xl font-bold text-amber-600 mt-1">
                        {formatoMoneda.format(reporte.saldoPendiente)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Pedidos
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {reporte.totalPedidos}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Ticket promedio
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {formatoMoneda.format(reporte.ticketPromedio)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <VentasChart
                      data={datosVentas}
                      titulo="Vendido por día"
                      serieNombre="Vendido"
                    />
                    <VentasChart
                      data={datosCobrado}
                      titulo="Cobrado por día"
                      serieNombre="Cobrado"
                    />
                    <div className="xl:col-span-2">
                      <MetodoPagoChart
                        data={reporte.cobradoPorMetodo}
                        titulo="Cobrado por método"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Ventas por vendedor
                    </h3>
                    {reporte.porVendedor.length === 0 ? (
                      <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
                        No hay ventas en este periodo.
                      </div>
                    ) : (
                      <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                              <th className="px-3 py-2 font-medium">Vendedor</th>
                              <th className="px-3 py-2 font-medium text-right">
                                Pedidos
                              </th>
                              <th className="px-3 py-2 font-medium text-right">
                                Vendido
                              </th>
                              <th className="px-3 py-2 font-medium text-right">
                                Cobrado
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {reporte.porVendedor.map((vendedor) => (
                              <tr key={vendedor.vendedorId ?? "sin_vendedor"}>
                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                  {vendedor.vendedorNombre}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                                  {vendedor.pedidos}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                  {formatoMoneda.format(vendedor.vendido)}
                                </td>
                                <td className="px-3 py-2 text-right text-emerald-600 whitespace-nowrap">
                                  {formatoMoneda.format(vendedor.cobrado)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Movimientos del periodo
                    </h3>
                    {reporte.movimientos.length === 0 ? (
                      <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
                        No hay movimientos en este periodo.
                      </div>
                    ) : (
                      <div className="overflow-auto max-h-96 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                            <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                              <th className="px-3 py-2 font-medium">Pedido</th>
                              <th className="px-3 py-2 font-medium">Fecha cobro</th>
                              <th className="px-3 py-2 font-medium">Cliente</th>
                              <th className="px-3 py-2 font-medium">Vendedor</th>
                              <th className="px-3 py-2 font-medium">Tipo</th>
                              <th className="px-3 py-2 font-medium">Método</th>
                              <th className="px-3 py-2 font-medium text-right">
                                Importe
                              </th>
                              <th className="px-3 py-2 font-medium">Cobrado por</th>
                              <th className="px-3 py-2 font-medium">Factura</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {reporte.movimientos.map((movimiento, indice) => (
                              <tr
                                key={`${movimiento.pedidoId}-${movimiento.tipo}-${indice}`}
                              >
                                <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  {movimiento.numeroPedido ?? "—"}
                                </td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                  {movimiento.fechaCobro}
                                </td>
                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                  {movimiento.clienteNombre}
                                </td>
                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                  {movimiento.vendedorNombre}
                                </td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                  {movimiento.tipo}
                                </td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                  {movimiento.metodoPago}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                  {formatoMoneda.format(movimiento.importe)}
                                </td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                  {movimiento.cobradoPorNombre}
                                </td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                  {movimiento.facturaEstado || "Sin factura"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!puedeVerTodo && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Mis ventas
                  </h3>
                  {reporte.movimientos.length === 0 ? (
                    <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
                      No tienes ventas en este periodo.
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-96 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                          <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                            <th className="px-3 py-2 font-medium">Pedido</th>
                            <th className="px-3 py-2 font-medium">Fecha</th>
                            <th className="px-3 py-2 font-medium">Cliente</th>
                            <th className="px-3 py-2 font-medium">Tipo</th>
                            <th className="px-3 py-2 font-medium">Método</th>
                            <th className="px-3 py-2 font-medium text-right">
                              Importe
                            </th>
                            <th className="px-3 py-2 font-medium">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {reporte.movimientos.map((movimiento, indice) => (
                            <tr
                              key={`${movimiento.pedidoId}-${movimiento.tipo}-${indice}`}
                            >
                              <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {movimiento.numeroPedido ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {movimiento.fechaCobro}
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                {movimiento.clienteNombre}
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                {movimiento.tipo}
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                {movimiento.metodoPago}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                {formatoMoneda.format(movimiento.importe)}
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                {movimiento.estado}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {puedeVerTodo
                    ? `${reporte.movimientos.length} movimiento${
                        reporte.movimientos.length === 1 ? "" : "s"
                      } · ${reporte.totalPedidos} pedido${
                        reporte.totalPedidos === 1 ? "" : "s"
                      }`
                    : `${reporte.movimientos.length} venta${
                        reporte.movimientos.length === 1 ? "" : "s"
                      } en el periodo`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={exportarResumen}
                    disabled={reporte.porDia.length === 0}
                  >
                    <i className="fas fa-file-csv mr-1" />
                    Descargar resumen CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportarMovimientos}
                    disabled={reporte.movimientos.length === 0}
                  >
                    <i className="fas fa-file-csv mr-1" />
                    Descargar movimientos CSV
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
