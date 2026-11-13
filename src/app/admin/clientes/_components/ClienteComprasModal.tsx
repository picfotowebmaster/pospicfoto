"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { descargarCSV } from "@/lib/utils/csv";
import {
  ETIQUETAS_PERIODO,
  calcularRangoPeriodo,
  type PeriodoKey,
} from "@/lib/utils/periodos";
import { ESTADOS_PEDIDO } from "@/lib/utils/constantes";
import {
  filasCsvCompras,
  listarComprasCliente,
  resumirCompras,
  type CompraCliente,
} from "@/lib/services/clientesAdmin";
import type { Cliente } from "@/lib/supabase/types";

interface ClienteComprasModalProps {
  cliente: Cliente | null;
  onClose: () => void;
}

const PERIODOS: PeriodoKey[] = ["hoy", "semana", "mes", "anio", "personalizado"];

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
  const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return formatoFecha.format(new Date(anio, mes - 1, dia));
}

function estadoLegible(estado: string): string {
  return ESTADOS_PEDIDO.find((item) => item.value === estado)?.label ?? estado;
}

function colorEstado(estado: string): string {
  return (
    ESTADOS_PEDIDO.find((item) => item.value === estado)?.color ??
    "bg-gray-400"
  );
}

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ClienteComprasModal({
  cliente,
  onClose,
}: ClienteComprasModalProps) {
  const [periodo, setPeriodo] = useState<PeriodoKey>("mes");
  const [desdeCustom, setDesdeCustom] = useState("");
  const [hastaCustom, setHastaCustom] = useState("");
  const [compras, setCompras] = useState<CompraCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cliente) return;
    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onClose();
    };
    document.addEventListener("keydown", manejarTecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = "";
    };
  }, [cliente, onClose]);

  const rango = useMemo(
    () =>
      calcularRangoPeriodo(periodo, {
        desde: desdeCustom,
        hasta: hastaCustom,
      }),
    [periodo, desdeCustom, hastaCustom],
  );

  const rangoValido =
    periodo !== "personalizado" ||
    (desdeCustom !== "" && hastaCustom !== "" && desdeCustom <= hastaCustom);

  useEffect(() => {
    if (!cliente || !rangoValido) return;
    let ignore = false;

    listarComprasCliente({
      clienteId: cliente.id,
      desde: rango.desde,
      hasta: rango.hasta,
    })
      .then((resultado) => {
        if (ignore) return;
        setCompras(resultado);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const mensaje =
          (err instanceof Error && err.message) ||
          ((err as Record<string, unknown>)?.message as string) ||
          "No se pudieron cargar las compras.";
        setError(mensaje);
        setCompras([]);
      })
      .finally(() => {
        if (!ignore) setCargando(false);
      });

    return () => {
      ignore = true;
    };
  }, [cliente, rango.desde, rango.hasta, rangoValido]);

  const resumen = useMemo(() => resumirCompras(compras), [compras]);

  function cambiarPeriodo(opcion: PeriodoKey) {
    if (opcion === periodo) return;

    setPeriodo(opcion);
    setError(null);

    if (
      opcion === "personalizado" &&
      (desdeCustom === "" || hastaCustom === "")
    ) {
      const inicial = calcularRangoPeriodo("mes");
      setDesdeCustom(inicial.desde);
      setHastaCustom(inicial.hasta);
    }

    setCargando(true);
  }

  function cambiarDesde(valor: string) {
    setDesdeCustom(valor);
    setError(null);
    setCargando(valor !== "" && hastaCustom !== "" && valor <= hastaCustom);
  }

  function cambiarHasta(valor: string) {
    setHastaCustom(valor);
    setError(null);
    setCargando(valor !== "" && desdeCustom !== "" && desdeCustom <= valor);
  }

  if (!cliente) return null;

  const clienteActual = cliente;

  function exportar() {
    if (compras.length === 0) return;
    const nombre = slug(clienteActual.nombre) || "cliente";
    descargarCSV(
      `compras-${nombre}-${periodo}-${rango.hasta}.csv`,
      filasCsvCompras(compras),
    );
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compras-cliente-titulo"
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl mx-4 border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <h3
              id="compras-cliente-titulo"
              className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate"
            >
              {cliente.nombre}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {[cliente.telefono, cliente.email].filter(Boolean).join(" · ") ||
                "Sin datos de contacto"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            aria-label="Cerrar"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-3 space-y-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
            {PERIODOS.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => cambiarPeriodo(opcion)}
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

          {periodo === "personalizado" ? (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="compras-desde"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                >
                  Desde
                </label>
                <input
                  id="compras-desde"
                  type="date"
                  value={desdeCustom}
                  onChange={(e) => cambiarDesde(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="compras-hasta"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                >
                  Hasta
                </label>
                <input
                  id="compras-hasta"
                  type="date"
                  value={hastaCustom}
                  onChange={(e) => cambiarHasta(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {!rangoValido && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Elige un rango de fechas válido.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Del {fechaLegible(rango.desde)} al {fechaLegible(rango.hasta)}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase">
                Compras
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {resumen.totalCompras}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase">
                Total
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatoMoneda.format(resumen.totalGastado)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase">
                Ticket promedio
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatoMoneda.format(resumen.ticketPromedio)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase">
                Última compra
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {fechaLegible(resumen.ultimaCompra)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 overflow-auto flex-1 min-h-0">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">
              {error}
            </div>
          )}

          {cargando ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">
              Cargando compras...
            </div>
          ) : compras.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">
              No hay compras en este periodo.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-3 font-medium">Pedido</th>
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Productos</th>
                  <th className="py-2 pr-3 font-medium text-right">Total</th>
                  <th className="py-2 pr-3 font-medium text-right">Saldo</th>
                  <th className="py-2 pr-3 font-medium">Pago</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {compras.map((compra) => {
                  const saldo =
                    compra.estado === "cancelado" || compra.saldo_cobrado
                      ? 0
                      : Math.max(
                          0,
                          Number(compra.total ?? 0) -
                            Number(compra.anticipo ?? 0),
                        );
                  const productos = (compra.detalle_pedidos ?? [])
                    .map(
                      (detalle) =>
                        `${detalle.cantidad}x ${detalle.producto_nombre}`,
                    )
                    .join(", ");
                  return (
                    <tr key={compra.id}>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {compra.numero_pedido ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {fechaLegible(compra.fecha_recepcion)}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 max-w-[280px] truncate">
                        {productos || "—"}
                      </td>
                      <td className="py-2 pr-3 text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatoMoneda.format(Number(compra.total ?? 0))}
                      </td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">
                        <span
                          className={
                            saldo > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          {formatoMoneda.format(saldo)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {compra.metodo_pago}
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <span
                            className={`w-2 h-2 rounded-full ${colorEstado(compra.estado)}`}
                          />
                          {estadoLegible(compra.estado)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {compras.length} compra{compras.length === 1 ? "" : "s"} en el
            periodo
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={exportar}
              disabled={compras.length === 0}
            >
              <i className="fas fa-file-csv mr-1" />
              Descargar CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
