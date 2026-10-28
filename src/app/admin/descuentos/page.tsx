"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { fechaHoyMexico } from "@/lib/utils/descuentos";
import {
  eliminarDescuento,
  guardarDescuento,
  listarDescuentos,
  listarOpcionesDescuento,
  toggleDescuento,
  type ConflictoDescuento,
  type DescuentoAdmin,
  type DescuentoInput,
  type OpcionesDescuento,
} from "./actions";
import { ModalDescuento } from "./_components/ModalDescuento";

const MENSAJE_MIGRACION = "048_descuentos.sql";

type EstadoDescuento = "Vigente" | "Programado" | "Vencido" | "Inactivo";

function estadoDescuento(d: DescuentoAdmin): EstadoDescuento {
  if (!d.activo) return "Inactivo";
  const hoy = fechaHoyMexico();
  if (hoy < d.fecha_inicio) return "Programado";
  if (hoy > d.fecha_fin) return "Vencido";
  return "Vigente";
}

function colorEstado(estado: EstadoDescuento): string {
  switch (estado) {
    case "Vigente":
      return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    case "Programado":
      return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "Vencido":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
}

function formatearValor(d: DescuentoAdmin): string {
  return d.tipo === "porcentaje"
    ? `${d.valor}%`
    : `$${d.valor.toFixed(2)}`;
}

function formatearFecha(fecha: string): string {
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year}`;
}

export default function DescuentosPage() {
  const { showError, showSuccess } = useToast();
  const [descuentos, setDescuentos] = useState<DescuentoAdmin[]>([]);
  const [opciones, setOpciones] = useState<OpcionesDescuento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [migracionPendiente, setMigracionPendiente] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<DescuentoAdmin | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [conflictos, setConflictos] = useState<ConflictoDescuento[]>([]);
  const [eliminando, setEliminando] = useState<DescuentoAdmin | null>(null);

  const obtenerDatos = useCallback(async () => {
    const [lista, opcionesData] = await Promise.all([
      listarDescuentos(),
      listarOpcionesDescuento(),
    ]);
    return { lista, opcionesData };
  }, []);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const { lista, opcionesData } = await obtenerDatos();
      setDescuentos(lista);
      setOpciones(opcionesData);
      setMigracionPendiente(false);
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Error al cargar descuentos";
      if (mensaje.includes(MENSAJE_MIGRACION)) {
        setMigracionPendiente(true);
      }
      showError(mensaje);
    } finally {
      setCargando(false);
    }
  }, [obtenerDatos, showError]);

  useEffect(() => {
    let cancelado = false;
    obtenerDatos()
      .then(({ lista, opcionesData }) => {
        if (cancelado) return;
        setDescuentos(lista);
        setOpciones(opcionesData);
        setMigracionPendiente(false);
      })
      .catch((err) => {
        if (cancelado) return;
        const mensaje =
          err instanceof Error ? err.message : "Error al cargar descuentos";
        if (mensaje.includes(MENSAJE_MIGRACION)) {
          setMigracionPendiente(true);
        }
        showError(mensaje);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [obtenerDatos, showError]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return descuentos.filter((d) => {
      const estado = estadoDescuento(d);
      if (estadoFiltro && estado !== estadoFiltro) return false;
      if (!q) return true;
      return (
        d.nombre.toLowerCase().includes(q) ||
        d.destino_nombre.toLowerCase().includes(q)
      );
    });
  }, [descuentos, filtro, estadoFiltro]);

  function abrirNuevo() {
    setEditando(null);
    setErrorModal(null);
    setConflictos([]);
    setModalOpen(true);
  }

  function abrirEditar(d: DescuentoAdmin) {
    setEditando(d);
    setErrorModal(null);
    setConflictos([]);
    setModalOpen(true);
  }

  async function handleGuardar(input: DescuentoInput) {
    setGuardando(true);
    setErrorModal(null);
    try {
      const resultado = await guardarDescuento(input);
      setModalOpen(false);
      setEditando(null);
      setConflictos(resultado.conflictos);
      await recargar();
      showSuccess(
        resultado.conflictos.length > 0
          ? "Descuento guardado. Hay promociones traslapadas para el mismo destino."
          : "Descuento guardado",
      );
    } catch (err) {
      setErrorModal(
        err instanceof Error ? err.message : "Error al guardar el descuento",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggle(d: DescuentoAdmin) {
    try {
      await toggleDescuento(d.id, !d.activo);
      await recargar();
      showSuccess(d.activo ? "Descuento desactivado" : "Descuento activado");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Error al cambiar el estado",
      );
    }
  }

  async function handleEliminar() {
    if (!eliminando) return;
    try {
      await eliminarDescuento(eliminando.id);
      setEliminando(null);
      await recargar();
      showSuccess("Descuento eliminado");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Error al eliminar el descuento",
      );
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {migracionPendiente && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          <p className="font-semibold">Falta aplicar la migración de descuentos</p>
          <p className="mt-1 text-xs">
            Ejecuta{" "}
            <code className="font-mono">
              supabase/migrations/048_descuentos.sql
            </code>{" "}
            en el SQL Editor de Supabase y recarga el esquema.
          </p>
        </div>
      )}

      {conflictos.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-semibold">
            Promociones traslapadas para el mismo destino
          </p>
          <p className="mt-0.5">
            Se aplicará automáticamente la que dé el mayor descuento al momento
            de la venta.
          </p>
          <ul className="mt-1 list-disc list-inside">
            {conflictos.map((c) => (
              <li key={c.id}>
                {c.nombre} · {formatearFecha(c.fecha_inicio)} a{" "}
                {formatearFecha(c.fecha_fin)}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setConflictos([])}
            className="mt-1 text-amber-700 underline dark:text-amber-300"
          >
            Ocultar
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              Descuentos
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Promociones automáticas por producto o categoría con vigencia.
            </p>
          </div>
          <Button size="sm" onClick={abrirNuevo} disabled={!opciones}>
            <i className="fas fa-plus mr-1.5" />
            Nuevo descuento
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nombre o destino..."
            className="flex-1 min-w-52 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="Vigente">Vigente</option>
            <option value="Programado">Programado</option>
            <option value="Vencido">Vencido</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <span className="text-xs text-gray-400">
            {filtrados.length} de {descuentos.length}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
        {cargando ? (
          <p className="p-6 text-sm text-gray-400">Cargando descuentos...</p>
        ) : filtrados.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">
            {descuentos.length === 0
              ? "No hay descuentos configurados."
              : "No hay descuentos que coincidan con el filtro."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {[
                    "Nombre",
                    "Alcance",
                    "Destino",
                    "Descuento",
                    "Vigencia",
                    "Estado",
                    "Acciones",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-2 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d) => {
                  const estado = estadoDescuento(d);
                  return (
                    <tr
                      key={d.id}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">
                        {d.nombre}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {d.alcance === "producto" ? "Producto" : "Categoría"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {d.destino_nombre}
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-100">
                        {formatearValor(d)}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatearFecha(d.fecha_inicio)} -{" "}
                        {formatearFecha(d.fecha_fin)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${colorEstado(estado)}`}
                        >
                          {estado}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEditar(d)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(d)}
                          >
                            {d.activo ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEliminando(d)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && opciones && (
        <ModalDescuento
          key={editando?.id ?? "nuevo"}
          opciones={opciones}
          initial={editando}
          saving={guardando}
          error={errorModal}
          onCancel={() => {
            if (guardando) return;
            setModalOpen(false);
            setEditando(null);
            setErrorModal(null);
          }}
          onSave={handleGuardar}
        />
      )}

      <ConfirmModal
        open={Boolean(eliminando)}
        title="Eliminar descuento"
        message={`¿Eliminar "${eliminando?.nombre ?? ""}"? Los pedidos anteriores conservarán su snapshot de descuento.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleEliminar}
        onCancel={() => setEliminando(null)}
      />
    </div>
  );
}
