"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";
import type { FacturaGlobal } from "@/lib/supabase/types";

const POR_PAGINA = 5;

const MOTIVOS_LABELS: Record<string, string> = {
  "01": "01 - Errores con relación",
  "02": "02 - Errores sin relación",
  "03": "03 - No se llevó a cabo la operación",
  "04": "04 - Operación nominativa en factura global",
};

interface FacturaGlobalPanelProps {
  onEmitida?: () => void;
}

function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function colorEstado(estado: string): string {
  if (estado === "emitida") return "bg-green-500";
  if (estado === "cancelada") return "bg-gray-500";
  if (estado === "error") return "bg-red-500";
  if (estado === "cancelacion_pendiente") return "bg-amber-500";
  return "bg-yellow-500";
}

function labelEstado(estado: string): string {
  if (estado === "emitida") return "Emitida";
  if (estado === "cancelada") return "Cancelada";
  if (estado === "error") return "Error";
  if (estado === "cancelacion_pendiente") return "Cancelación pendiente";
  return "Pendiente";
}

export function FacturaGlobalPanel({ onEmitida }: FacturaGlobalPanelProps) {
  const { showError, showSuccess } = useToast();
  const [periodo, setPeriodo] = useState(periodoActual);
  const [emitiendo, setEmitiendo] = useState(false);
  const [globales, setGlobales] = useState<FacturaGlobal[]>([]);
  const [totalGlobales, setTotalGlobales] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [resultado, setResultado] = useState<{
    uuid: string;
    pdfUrl: string | null;
    xmlUrl: string | null;
    total: number;
    pedidosCount: number;
    folio: string;
    emailEnviado: boolean;
    emailError: string | null;
  } | null>(null);
  const [cancelando, setCancelando] = useState<FacturaGlobal | null>(null);
  const [motivo, setMotivo] = useState("02");
  const [uuidRelacionado, setUuidRelacionado] = useState("");
  const [cancelandoEnvio, setCancelandoEnvio] = useState(false);

  const consultar = useCallback(
    (paginaActual: number, periodoFiltro: string) => {
      const desde = (paginaActual - 1) * POR_PAGINA;
      const base = supabase
        .from("facturas_globales")
        .select("*", { count: "exact" });
      const query = periodoFiltro
        ? base.eq("periodo", periodoFiltro)
        : base;

      return query
        .order("created_at", { ascending: false })
        .range(desde, desde + POR_PAGINA - 1);
    },
    [],
  );

  const cargar = useCallback(async () => {
    const { data, count } = await consultar(pagina, filtroPeriodo);
    setGlobales((data ?? []) as FacturaGlobal[]);
    setTotalGlobales(count ?? 0);
  }, [consultar, pagina, filtroPeriodo]);

  useEffect(() => {
    let activo = true;

    consultar(pagina, filtroPeriodo).then(
      ({ data, count }: { data: unknown; count: number | null }) => {
        if (!activo) return;
        setGlobales((data ?? []) as FacturaGlobal[]);
        setTotalGlobales(count ?? 0);
      },
    );

    return () => {
      activo = false;
    };
  }, [consultar, pagina, filtroPeriodo]);

  const totalPaginas = Math.max(1, Math.ceil(totalGlobales / POR_PAGINA));

  async function emitir() {
    setEmitiendo(true);
    setResultado(null);

    try {
      const res = await fetch("/api/facturacion/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodo }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showError(data.error || "Error al emitir la factura global");
        return;
      }

      setResultado({
        uuid: data.uuid,
        pdfUrl: data.pdfUrl ?? null,
        xmlUrl: data.xmlUrl ?? null,
        total: Number(data.total ?? 0),
        pedidosCount: Number(data.pedidosCount ?? 0),
        folio: String(data.folio ?? ""),
        emailEnviado: Boolean(data.emailEnviado),
        emailError: data.emailError ? String(data.emailError) : null,
      });
      showSuccess(
        `Factura global emitida (${data.pedidosCount ?? 0} pedidos)`,
      );
      if (pagina !== 1) {
        setPagina(1);
      } else {
        await cargar();
      }
      onEmitida?.();
    } catch {
      showError("Error de conexión al emitir la factura global");
    } finally {
      setEmitiendo(false);
    }
  }

  function abrirCancelacion(global: FacturaGlobal) {
    setMotivo("02");
    setUuidRelacionado("");
    setCancelando(global);
  }

  async function ejecutarCancelacion() {
    if (!cancelando) return;

    setCancelandoEnvio(true);
    try {
      const res = await fetch("/api/facturacion/global/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cancelando.id,
          motivo,
          uuidRelacionado: motivo === "01" ? uuidRelacionado : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showError(data.error || "Error al cancelar la factura global");
        return;
      }

      if (data.estado === "cancelacion_pendiente") {
        showSuccess(
          "Cancelación solicitada: queda pendiente de aceptación.",
        );
      } else {
        showSuccess("Factura global cancelada correctamente.");
      }

      setCancelando(null);
      await cargar();
      onEmitida?.();
    } catch {
      showError("Error de conexión al cancelar la factura global");
    } finally {
      setCancelandoEnvio(false);
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase">
            Factura global mensual
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Incluye los pedidos pagados sin RFC que aún no tienen factura
            individual.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label
              htmlFor="periodo-global"
              className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1"
            >
              Periodo
            </label>
            <input
              id="periodo-global"
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            size="sm"
            variant="success"
            onClick={emitir}
            disabled={emitiendo || !periodo}
          >
            {emitiendo ? (
              <span className="inline-flex items-center gap-1">
                <i className="fas fa-spinner animate-spin" />
                Emitiendo...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <i className="fas fa-file-invoice" />
                Emitir global
              </span>
            )}
          </Button>
        </div>
      </div>

      {resultado && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm">
          <p className="font-semibold text-green-800 dark:text-green-200">
            <i className="fas fa-check-circle mr-1" />
            Factura global emitida
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            Folio: {resultado.folio} · Pedidos: {resultado.pedidosCount} · Total:
            ${resultado.total.toFixed(2)}
          </p>
          <p className="font-mono text-[11px] text-green-700 dark:text-green-300 break-all mt-1">
            UUID: {resultado.uuid}
          </p>
          {resultado.emailEnviado ? (
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              <i className="fas fa-envelope mr-1" />
              Enviada al contador.
            </p>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {resultado.emailError ||
                "No se pudo enviar por correo al contador."}
            </p>
          )}
          <div className="flex gap-3 mt-2">
            {resultado.pdfUrl && (
              <a
                href={resultado.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Descargar PDF
              </a>
            )}
            {resultado.xmlUrl && (
              <a
                href={resultado.xmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Ver XML
              </a>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2 flex-wrap">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Historial de facturas globales
          </h4>
          <div className="flex items-end gap-2">
            <div>
              <label
                htmlFor="filtro-periodo-global"
                className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1"
              >
                Filtrar por periodo
              </label>
              <input
                id="filtro-periodo-global"
                type="month"
                value={filtroPeriodo}
                onChange={(e) => {
                  setFiltroPeriodo(e.target.value);
                  setPagina(1);
                }}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {filtroPeriodo && (
              <button
                type="button"
                onClick={() => {
                  setFiltroPeriodo("");
                  setPagina(1);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 pb-2 cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {globales.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
            Sin facturas globales para el filtro seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500">
                  <th className="py-1.5 pr-3 font-medium">Periodo</th>
                  <th className="py-1.5 pr-3 font-medium">Folio</th>
                  <th className="py-1.5 pr-3 font-medium">Pedidos</th>
                  <th className="py-1.5 pr-3 font-medium">Total</th>
                  <th className="py-1.5 pr-3 font-medium">Estado</th>
                  <th className="py-1.5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {globales.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">
                      {g.periodo}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-gray-600 dark:text-gray-400">
                      {(g.serie || "") + (g.folio || "")}
                    </td>
                    <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">
                      {g.pedidos_count ?? 0}
                    </td>
                    <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">
                      ${Number(g.total ?? 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 pr-3">
                      <Badge color={colorEstado(g.estado)}>
                        {labelEstado(g.estado)}
                      </Badge>
                    </td>
                    <td className="py-1.5 text-right space-x-2 whitespace-nowrap">
                      {g.pdf_url && (
                        <a
                          href={g.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          PDF
                        </a>
                      )}
                      {g.xml_url && (
                        <a
                          href={g.xml_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          XML
                        </a>
                      )}
                      {g.estado === "emitida" && (
                        <button
                          type="button"
                          onClick={() => abrirCancelacion(g)}
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                          title="Cancelar factura global"
                        >
                          Cancelar
                        </button>
                      )}
                      {!g.pdf_url &&
                        !g.xml_url &&
                        g.estado !== "emitida" && (
                          <span className="text-gray-400">—</span>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
          <span>
            Página {pagina} de {totalPaginas} · {totalGlobales} factura(s)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={pagina <= 1}
              onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pagina >= totalPaginas}
              onClick={() =>
                setPagina((actual) => Math.min(totalPaginas, actual + 1))
              }
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {cancelando && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => {
              if (!cancelandoEnvio) setCancelando(null);
            }}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-5 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Cancelar factura global
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Periodo {cancelando.periodo} ·{" "}
              <span className="font-mono text-xs">
                {cancelando.uuid || "sin UUID"}
              </span>
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Motivo de cancelación
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                >
                  {Object.entries(MOTIVOS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {motivo === "01" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    UUID relacionado
                  </label>
                  <input
                    value={uuidRelacionado}
                    onChange={(e) => setUuidRelacionado(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelando(null)}
                disabled={cancelandoEnvio}
              >
                Volver
              </Button>
              <button
                type="button"
                onClick={ejecutarCancelacion}
                disabled={cancelandoEnvio}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 bg-red-600 hover:bg-red-700"
              >
                {cancelandoEnvio ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
