"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CATEGORIAS_GASTO } from "@/lib/utils/constantes";
import { fechaNegocio } from "@/lib/utils/fechas";
import type { NuevoGastoCaja } from "@/lib/services/gastos";
import type { GastoCaja, Sucursal } from "@/lib/supabase/types";

interface GastosCajaPanelProps {
  gastos: GastoCaja[];
  totalGastos: number;
  cargando: boolean;
  error: string | null;
  puedeCrear: boolean;
  puedeAnular: boolean;
  sucursalFijaId: string | null;
  sucursales: Sucursal[];
  onCrear: (gasto: NuevoGastoCaja) => Promise<void>;
  onAnular: (id: string) => Promise<void>;
}

const formatoMoneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function GastosCajaPanel({
  gastos,
  totalGastos,
  cargando,
  error,
  puedeCrear,
  puedeAnular,
  sucursalFijaId,
  sucursales,
  onCrear,
  onAnular,
}: GastosCajaPanelProps) {
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(fechaNegocio());
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [montoTexto, setMontoTexto] = useState("");
  const [sucursalId, setSucursalId] = useState(sucursalFijaId ?? "");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [gastoAAnular, setGastoAAnular] = useState<GastoCaja | null>(null);
  const [mostrarAnulados, setMostrarAnulados] = useState(false);

  const sucursalEfectiva = sucursalFijaId ?? sucursalId;
  const monto = Number(montoTexto);
  const hayAnulados = gastos.some((gasto) => gasto.anulado);
  const visibles = mostrarAnulados
    ? gastos
    : gastos.filter((gasto) => !gasto.anulado);

  function limpiarFormulario() {
    setFecha(fechaNegocio());
    setConcepto("");
    setCategoria("");
    setMontoTexto("");
    if (!sucursalFijaId) setSucursalId("");
    setErrorForm(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorForm(null);

    if (concepto.trim() === "") {
      setErrorForm("Escribe el concepto del gasto.");
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      setErrorForm("El monto debe ser mayor a cero.");
      return;
    }
    if (!sucursalEfectiva) {
      setErrorForm("Selecciona la sucursal del gasto.");
      return;
    }

    setGuardando(true);
    try {
      await onCrear({
        sucursal_id: sucursalEfectiva,
        concepto: concepto.trim(),
        categoria: categoria || null,
        monto,
        fecha,
      });
      limpiarFormulario();
      setAbierto(false);
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : "No se pudo registrar el gasto.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function handleAnular() {
    if (!gastoAAnular) return;
    setAnulandoId(gastoAAnular.id);
    try {
      await onAnular(gastoAAnular.id);
      setGastoAAnular(null);
    } finally {
      setAnulandoId(null);
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Gastos de caja
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Gastos pagados del efectivo de caja en el periodo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {puedeAnular && hayAnulados && (
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarAnulados}
                onChange={(e) => setMostrarAnulados(e.target.checked)}
              />
              Mostrar anulados
            </label>
          )}
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Total: {formatoMoneda.format(totalGastos)}
          </p>
          {puedeCrear && (
            <Button
              size="sm"
              variant={abierto ? "ghost" : "primary"}
              onClick={() => {
                setAbierto((valor) => !valor);
                setErrorForm(null);
              }}
            >
              <i className={`fas ${abierto ? "fa-xmark" : "fa-plus"} mr-1`} />
              {abierto ? "Cancelar" : "Agregar gasto"}
            </Button>
          )}
        </div>
      </div>

      {abierto && puedeCrear && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Concepto *
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej. Compra de tinta"
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin categoría</option>
                {CATEGORIAS_GASTO.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Monto *
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                value={montoTexto}
                onChange={(e) => setMontoTexto(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {!sucursalFijaId && (
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Sucursal *
              </label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona una sucursal</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {errorForm && (
            <p className="text-xs text-red-600 dark:text-red-400">{errorForm}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAbierto(false);
                limpiarFormulario();
              }}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button size="sm" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar gasto"}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {cargando ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">
          Cargando gastos...
        </p>
      ) : visibles.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">
          {gastos.length === 0
            ? "No hay gastos registrados en este periodo."
            : "No hay gastos activos en este periodo."}
        </p>
      ) : (
        <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Concepto</th>
                <th className="px-3 py-2 font-medium">Categoría</th>
                <th className="px-3 py-2 font-medium">Registrado por</th>
                <th className="px-3 py-2 font-medium text-right">Monto</th>
                {puedeAnular && <th className="px-3 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {visibles.map((gasto) => (
                <tr
                  key={gasto.id}
                  className={gasto.anulado ? "opacity-60" : undefined}
                >
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {gasto.fecha}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    <span
                      className={
                        gasto.anulado
                          ? "line-through decoration-red-500"
                          : undefined
                      }
                    >
                      {gasto.concepto}
                    </span>
                    {gasto.anulado && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">
                        Anulado
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {gasto.categoria || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {gasto.registrado_por_nombre || "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right whitespace-nowrap ${
                      gasto.anulado
                        ? "text-gray-400 dark:text-gray-500 line-through"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatoMoneda.format(gasto.monto)}
                  </td>
                  {puedeAnular && (
                    <td className="px-3 py-2 text-right">
                      {!gasto.anulado && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setGastoAAnular(gasto)}
                          disabled={anulandoId === gasto.id}
                        >
                          Anular
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300" colSpan={4}>
                  Totales
                </td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {formatoMoneda.format(totalGastos)}
                </td>
                {puedeAnular && <td className="px-3 py-2" />}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={gastoAAnular !== null}
        title="Anular gasto"
        message={`¿Anular el gasto "${gastoAAnular?.concepto ?? ""}"? Dejará de contar en el corte.`}
        confirmLabel="Anular"
        onConfirm={() => void handleAnular()}
        onCancel={() => setGastoAAnular(null)}
      />
    </div>
  );
}
