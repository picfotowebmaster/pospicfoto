"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PrevisualizacionValoresCsv } from "@/lib/utils/atributosCsv";
import {
  aplicarValoresCsv,
  previsualizarValoresCsv,
} from "../catalogo/actions";

interface ModalImportarValoresCsvProps {
  open: boolean;
  atributoId: string;
  atributoNombre: string;
  onClose: () => void;
  onApplied: () => void;
}

export function ModalImportarValoresCsv({
  open,
  atributoId,
  atributoNombre,
  onClose,
  onApplied,
}: ModalImportarValoresCsvProps) {
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [contenido, setContenido] = useState("");
  const [preview, setPreview] =
    useState<PrevisualizacionValoresCsv | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    valores_creados: number;
  } | null>(null);

  const puedeAplicar = useMemo(() => {
    if (!preview || cargando || aplicando || preview.errores.length > 0) {
      return false;
    }
    return preview.payload.length > 0;
  }, [preview, cargando, aplicando]);

  if (!open) return null;

  async function seleccionarArchivo(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;

    if (!archivo.name.toLowerCase().endsWith(".csv")) {
      setError("Selecciona un archivo con extensión .csv.");
      return;
    }

    if (archivo.size > 1_000_000) {
      setError("El archivo supera 1 MB. Divide la importación en partes.");
      return;
    }

    setNombreArchivo(archivo.name);
    setPreview(null);
    setResultado(null);
    setError(null);
    setCargando(true);

    try {
      const texto = await archivo.text();
      setContenido(texto);
      const data = await previsualizarValoresCsv(atributoId, texto);
      setPreview(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer el archivo.",
      );
      setContenido("");
    } finally {
      setCargando(false);
    }
  }

  async function aplicar() {
    if (!contenido || !puedeAplicar) return;

    setAplicando(true);
    setError(null);

    try {
      const data = await aplicarValoresCsv(atributoId, contenido);
      setResultado({ valores_creados: data.valores_creados });
      onApplied();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron aplicar los valores.",
      );
    } finally {
      setAplicando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={() => {
          if (!aplicando) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="importar-valores-csv-title"
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 space-y-4"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
          <div>
            <h2
              id="importar-valores-csv-title"
              className="text-lg font-bold text-gray-900 dark:text-gray-100"
            >
              Importar valores: {atributoNombre}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Solo agrega valores; no modifica ni borra los existentes.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={aplicando}
          >
            <i className="fas fa-times" />
          </Button>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200 space-y-1">
          <p>
            Usa la plantilla con una sola columna <strong>Valor</strong>.
          </p>
          <p>
            Captura <strong>un valor por fila</strong>. No incluyas columnas
            Atributo ni Valores.
          </p>
          <p>
            El atributo seleccionado es <strong>{atributoNombre}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer">
            <i className="fas fa-file-upload" />
            Seleccionar archivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={seleccionarArchivo}
              disabled={cargando || aplicando}
            />
          </label>
          {nombreArchivo && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {nombreArchivo}
            </span>
          )}
          {cargando && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <i className="fas fa-spinner fa-spin mr-1.5" />
              Validando archivo...
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {resultado && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            <p className="font-semibold">Importación aplicada</p>
            <p className="text-xs mt-1">
              {resultado.valores_creados} valor(es) nuevo(s) para{" "}
              {atributoNombre}.
            </p>
          </div>
        )}

        {preview && !resultado && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              {[
                ["Filas", preview.resumen.filas],
                ["Valores nuevos", preview.resumen.valores_nuevos],
                ["Duplicados", preview.resumen.valores_duplicados],
                ["Errores", preview.resumen.errores],
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

            {preview.errores.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Corrige estos errores antes de aplicar
                </p>
                <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-red-800 dark:text-red-300 space-y-0.5">
                  {preview.errores.map((item, index) => (
                    <li key={`${item.fila}-${index}`}>
                      {item.fila > 0 ? `Fila ${item.fila}: ` : ""}
                      {item.mensaje}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.filas.length > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5">
                          Fila
                        </th>
                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5">
                          Valores
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.filas.map((fila) => (
                        <tr
                          key={fila.fila}
                          className="border-t border-gray-100 dark:border-gray-800"
                        >
                          <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                            {fila.fila}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                            {fila.valores.join(" | ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
              <p className="mr-auto text-xs text-gray-500 dark:text-gray-400">
                Se agregarán {preview.resumen.valores_nuevos} valor(es) a{" "}
                {atributoNombre}.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={aplicando}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={aplicar} disabled={!puedeAplicar}>
                {aplicando ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-1.5" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-1.5" />
                    Aplicar valores
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
