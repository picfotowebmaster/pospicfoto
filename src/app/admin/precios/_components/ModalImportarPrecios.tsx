"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ImportacionResumen } from "@/lib/services/importarPreciosWeb";
import { descargarCsv, slugArchivo } from "@/lib/utils/descargarCsv";
import { construirCsvImportacion } from "@/lib/utils/importarPrecios";

interface ModalImportarPreciosProps {
  open: boolean;
  resumen: ImportacionResumen | null;
  cargando: boolean;
  aplicando: boolean;
  aplicado: boolean;
  error: string | null;
  reemplazar: boolean;
  onReemplazarChange: (value: boolean) => void;
  onCancel: () => void;
  onAplicar: () => void;
}

function money(valor: number): string {
  return valor.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

const ESTADOS: Record<string, string> = {
  nuevo: "Nuevo",
  actualizado: "Actualizado",
  sin_cambios: "Sin cambios",
};

export function ModalImportarPrecios({
  open,
  resumen,
  cargando,
  aplicando,
  aplicado,
  error,
  reemplazar,
  onReemplazarChange,
  onCancel,
  onAplicar,
}: ModalImportarPreciosProps) {
  const [detalleFiltro, setDetalleFiltro] = useState("");

  const conflictos = resumen?.conflictos ?? [];
  const faltantes = resumen?.faltantes ?? [];
  const problemas = [
    ...(resumen?.incompletos ?? []),
    ...(resumen?.sin_mapear ?? []),
  ];

  const detalleFiltrado = useMemo(() => {
    const q = detalleFiltro.trim().toLowerCase();
    const detalle = resumen?.detalle ?? [];
    if (!q) return detalle;
    return detalle.filter((fila) => fila.etiqueta.toLowerCase().includes(q));
  }, [resumen, detalleFiltro]);

  const csv = useMemo(() => {
    if (!resumen) return "";
    return construirCsvImportacion({
      producto: resumen.producto.nombre,
      detalle: resumen.detalle,
      conflictos: resumen.conflictos,
      faltantes: resumen.faltantes,
      incompletos: resumen.incompletos,
      sin_mapear: resumen.sin_mapear,
    });
  }, [resumen]);

  if (!open) return null;

  function descargar() {
    if (!resumen) return;
    descargarCsv(`precios-${slugArchivo(resumen.producto.nombre) || "producto"}.csv`, csv);
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={() => {
          if (!aplicando) onCancel();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="importar-precios-title"
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 space-y-4"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="importar-precios-title"
                className="text-lg font-bold text-gray-900 dark:text-gray-100"
              >
                {aplicado
                  ? "Log de importación"
                  : "Importar precios desde la tienda"}
              </h2>
              {aplicado && (
                <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-green-100 text-green-700 px-2 py-0.5 dark:bg-green-900/30 dark:text-green-300">
                  Aplicado
                </span>
              )}
            </div>
            {resumen && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {resumen.producto.nombre} · WooCommerce #{resumen.web.id}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cerrar"
            onClick={onCancel}
            disabled={aplicando}
          >
            <i className="fas fa-times" />
          </Button>
        </div>

        {cargando && (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-spinner fa-spin mr-2" />
            Leyendo variaciones de la tienda...
          </div>
        )}

        {error && !cargando && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {resumen && !cargando && (
          <>
            {aplicado && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
                Importación aplicada. Este es el log de los precios enviados;
                puedes descargarlo en CSV.
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              {[
                ["Variaciones", resumen.total_variaciones],
                ["Precios detectados", resumen.precios_importados],
                ["Nuevos", resumen.nuevos],
                ["Actualizados", resumen.actualizados],
                ["Sin cambios", resumen.sin_cambios],
                ["Precios actuales", resumen.precios_existentes],
                ["A guardar", resumen.precios_a_guardar],
                ["Conflictos", conflictos.length],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-2 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {aplicado ? "Precios importados" : "Precios a cargar"} (
                  {resumen.detalle.length})
                </p>
                <input
                  type="search"
                  value={detalleFiltro}
                  onChange={(e) => setDetalleFiltro(e.target.value)}
                  placeholder="Buscar variante..."
                  className="flex-1 min-w-48 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={descargar}
                  disabled={!resumen.detalle.length}
                >
                  <i className="fas fa-download mr-1.5" />
                  Descargar CSV
                </Button>
              </div>
              {detalleFiltrado.length === 0 ? (
                <p className="p-3 text-xs text-gray-400">
                  No hay precios que coincidan con el filtro.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5">
                          Variante
                        </th>
                        <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5 w-32">
                          Precio
                        </th>
                        <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5 w-28">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleFiltrado.map((fila, index) => (
                        <tr
                          key={`${fila.etiqueta}-${index}`}
                          className="border-t border-gray-100 dark:border-gray-800"
                        >
                          <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                            {fila.etiqueta}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">
                            {money(fila.precio)}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                fila.estado === "nuevo"
                                  ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                  : fila.estado === "actualizado"
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              {ESTADOS[fila.estado] ?? fila.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {conflictos.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {conflictos.length} combinación(es) con precios distintos
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  No se cargaron. Revísalas y captura el precio correcto en la
                  matriz.
                </p>
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {conflictos.map((c, index) => (
                    <p
                      key={index}
                      className="text-xs text-amber-900 dark:text-amber-200"
                    >
                      <span className="font-medium">{c.etiqueta}</span>:{" "}
                      {c.precios.map(money).join(" / ")}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {faltantes.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {faltantes.length} combinación(es) sin precio en la tienda
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Quedarán sin precio y el POS pedirá capturarlo manualmente.
                </p>
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {faltantes.map((f, index) => (
                    <p
                      key={index}
                      className="text-xs text-gray-700 dark:text-gray-300"
                    >
                      {f.etiqueta}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {problemas.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                  {problemas.length} variación(es) no se pudieron leer
                </p>
                <div className="mt-2 max-h-28 overflow-y-auto space-y-1">
                  {problemas.map((p, index) => (
                    <p
                      key={index}
                      className="text-xs text-red-800 dark:text-red-300"
                    >
                      #{p.variacion_id}: {p.motivo}
                      {p.atributo ? ` (${p.atributo}` : ""}
                      {p.valor ? `: ${p.valor}` : ""}
                      {p.atributo ? ")" : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {conflictos.length === 0 && faltantes.length === 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
                La tienda devolvió precios completos para todas las
                combinaciones.
              </div>
            )}

            {!aplicado && (
              <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reemplazar}
                  onChange={(e) => onReemplazarChange(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Reemplazar precios existentes. Si lo dejas apagado, se
                  conservan los precios que ya hayas capturado y que no vengan
                  en la tienda.
                </span>
              </label>
            )}
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          {aplicado ? (
            <>
              <Button variant="ghost" size="sm" onClick={descargar}>
                <i className="fas fa-download mr-1.5" />
                Descargar CSV
              </Button>
              <Button size="sm" onClick={onCancel}>
                Cerrar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={aplicando}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={onAplicar}
                disabled={cargando || aplicando || !resumen}
              >
                {aplicando ? "Importando..." : "Aplicar importación"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
