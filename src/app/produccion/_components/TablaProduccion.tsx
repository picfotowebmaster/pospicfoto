"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ESTADOS_PEDIDO } from "@/lib/utils/constantes";
import type { Pedido, EstadoPedido } from "@/lib/supabase/types";

function formatearFecha(fecha: string, hora?: string): string {
  const d = new Date(fecha + "T" + (hora || "00:00:00"));
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearFechaCorta(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface TablaProduccionProps {
  pedidos: Pedido[];
  zona: "taller" | "corte";
  onCambiarEstado: (id: string, estado: EstadoPedido) => Promise<void>;
}

function accionLabel(
  zona: "taller" | "corte",
  estado: string,
): { label: string; nextEstado: EstadoPedido } | null {
  if (zona === "taller" && estado === "pendiente")
    return { label: "Iniciar Producción", nextEstado: "en_taller" };
  if (zona === "taller" && estado === "en_taller")
    return { label: "Enviar a Corte", nextEstado: "en_corte" };
  if (zona === "corte" && estado === "en_corte")
    return { label: "Marcar como Listo", nextEstado: "listo" };
  return null;
}

export function TablaProduccion({
  pedidos,
  zona,
  onCambiarEstado,
}: TablaProduccionProps) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);

  function toggleExpandir(id: string) {
    setExpandido((prev) => (prev === id ? null : id));
  }

  async function cambiarEstado(id: string, estado: EstadoPedido) {
    if (estado === "en_corte" && !window.confirm("¿Enviar esta orden a Corte?")) {
      return;
    }
    setCambiando(id);
    try {
      await onCambiarEstado(id, estado);
    } finally {
      setCambiando(null);
    }
  }

  if (pedidos.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        No hay órdenes para esta área.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 px-3 font-medium text-gray-500 w-10">#</th>
            <th className="py-2 px-3 font-medium text-gray-500">Cliente</th>
            <th className="py-2 px-3 font-medium text-gray-500 hidden md:table-cell">
              Teléfono
            </th>
            <th className="py-2 px-3 font-medium text-gray-500">Entrega</th>
            <th className="py-2 px-3 font-medium text-gray-500">Productos</th>
            <th className="py-2 px-3 font-medium text-gray-500">Estado</th>
            <th className="py-2 px-3 font-medium text-gray-500 text-right">
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p, idx) => {
            const accion = accionLabel(zona, p.estado);
            const lineas = p.detalle_pedidos ?? [];

            return (
              <React.Fragment key={p.id}>
                <tr
                  onClick={() => toggleExpandir(p.id)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-2 px-3 text-gray-400 text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 text-gray-900 font-medium">
                    {p.cliente_nombre}
                    {p.requiere_correccion && (
                      <span
                        className="ml-1.5 text-orange-500 text-xs"
                        title="Requiere corrección"
                      >
                        &#9679;
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-500 hidden md:table-cell">
                    {p.cliente_telefono || "—"}
                  </td>
                  <td className="py-2 px-3 text-gray-700 text-xs">
                    <div>
                      {formatearFecha(p.fecha_entrega, p.hora_entrega)}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-600 text-xs">
                    {lineas.length === 1
                      ? lineas[0].producto_nombre
                      : `${lineas.length} productos`}
                  </td>
                  <td className="py-2 px-3">
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td
                    className="py-2 px-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {accion && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={cambiando === p.id}
                        onClick={() =>
                          cambiarEstado(p.id, accion.nextEstado)
                        }
                      >
                        {cambiando === p.id ? "..." : accion.label}
                      </Button>
                    )}
                  </td>
                </tr>
                {expandido === p.id && (
                  <tr>
                    <td
                      colSpan={7}
                      className="bg-gray-50 border-b border-gray-200"
                    >
                      <div className="px-6 py-3 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400">Recibido:</span>{" "}
                            <span className="text-gray-700">
                              {formatearFechaCorta(p.fecha_recepcion)}{" "}
                              {p.hora_recepcion?.slice(0, 5)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Subtotal:</span>{" "}
                            <span className="text-gray-700">
                              ${p.subtotal.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Resta:</span>{" "}
                            <span className="text-gray-700">
                              ${(p.total - p.anticipo).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Corrección:</span>{" "}
                            <span
                              className={
                                p.requiere_correccion
                                  ? "text-orange-600 font-medium"
                                  : "text-gray-700"
                              }
                            >
                              {p.requiere_correccion ? "Sí" : "No"}
                            </span>
                          </div>
                        </div>

                        {lineas.length > 0 && (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-200">
                                <th className="py-1 pr-3 text-left font-medium">
                                  Producto
                                </th>
                                <th className="py-1 px-2 text-center font-medium w-16">
                                  Cant.
                                </th>
                                <th className="py-1 px-2 text-right font-medium w-20">
                                  P. Unit.
                                </th>
                                <th className="py-1 pl-2 text-right font-medium w-20">
                                  Importe
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {lineas.map((l) => (
                                <tr
                                  key={l.id}
                                  className="border-b border-gray-100"
                                >
                                  <td className="py-1 pr-3 text-gray-700">
                                    {l.producto_nombre}
                                    {l.atributos &&
                                      Object.keys(l.atributos).length > 0 && (
                                        <span className="text-gray-400 ml-1">
                                          (
                                          {Object.entries(l.atributos)
                                            .map(([k, v]) => `${k}: ${v}`)
                                            .join(", ")}
                                          )
                                        </span>
                                      )}
                                  </td>
                                  <td className="py-1 px-2 text-center text-gray-600">
                                    {l.cantidad}
                                  </td>
                                  <td className="py-1 px-2 text-right text-gray-600">
                                    ${l.precio_unitario.toFixed(2)}
                                  </td>
                                  <td className="py-1 pl-2 text-right text-gray-800 font-medium">
                                    ${l.importe_linea.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const def = ESTADOS_PEDIDO.find((e) => e.value === estado);
  const color = def
    ? def.color.replace("bg-", "bg-").replace("-500", "-100")
    : "bg-gray-100";
  const textoColor = def
    ? def.color.replace("bg-", "text-").replace("-500", "-700")
    : "text-gray-700";
  const label = def?.label ?? estado;

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color} ${textoColor}`}
    >
      {label}
    </span>
  );
}
