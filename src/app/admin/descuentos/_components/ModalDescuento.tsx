"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import type {
  AlcanceDescuento,
  TipoDescuento,
} from "@/lib/supabase/types";
import { fechaHoyMexico } from "@/lib/utils/descuentos";
import type {
  DescuentoAdmin,
  DescuentoInput,
  OpcionesDescuento,
} from "../actions";

interface ModalDescuentoProps {
  opciones: OpcionesDescuento;
  initial: DescuentoAdmin | null;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (input: DescuentoInput) => void;
}

function sumarDias(fechaISO: string, dias: number): string {
  const [year, month, day] = fechaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(year, month - 1, day + dias));
  return fecha.toISOString().slice(0, 10);
}

export function ModalDescuento({
  opciones,
  initial,
  saving,
  error,
  onCancel,
  onSave,
}: ModalDescuentoProps) {
  const hoy = fechaHoyMexico();
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoDescuento>(
    initial?.tipo ?? "porcentaje",
  );
  const [valor, setValor] = useState(
    initial?.valor !== undefined ? String(initial.valor) : "10",
  );
  const [alcance, setAlcance] = useState<AlcanceDescuento>(
    initial?.alcance ?? "producto",
  );
  const [categoriaId, setCategoriaId] = useState(
    initial?.categoria_id ??
      opciones.productos.find((p) => p.id === initial?.producto_id)
        ?.categoria_id ??
      "",
  );
  const [productoId, setProductoId] = useState(initial?.producto_id ?? "");
  const [fechaInicio, setFechaInicio] = useState(
    initial?.fecha_inicio ?? hoy,
  );
  const [fechaFin, setFechaFin] = useState(
    initial?.fecha_fin ?? sumarDias(hoy, 7),
  );
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [localError, setLocalError] = useState<string | null>(null);

  const productosFiltrados = categoriaId
    ? opciones.productos.filter((p) => p.categoria_id === categoriaId)
    : opciones.productos;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!nombre.trim()) {
      setLocalError("El nombre es obligatorio");
      return;
    }
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) {
      setLocalError("El valor debe ser mayor a 0");
      return;
    }
    if (tipo === "porcentaje" && numero >= 100) {
      setLocalError("El porcentaje debe ser menor a 100");
      return;
    }
    if (fechaFin < fechaInicio) {
      setLocalError("La fecha final debe ser igual o posterior a la inicial");
      return;
    }
    if (alcance === "producto" && !productoId) {
      setLocalError("Selecciona un producto");
      return;
    }
    if (alcance === "categoria" && !categoriaId) {
      setLocalError("Selecciona una categoría");
      return;
    }

    onSave({
      id: initial?.id,
      nombre: nombre.trim(),
      tipo,
      valor: numero,
      alcance,
      producto_id: alcance === "producto" ? productoId : null,
      categoria_id: alcance === "categoria" ? categoriaId : null,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      activo,
    });
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={() => {
          if (!saving) onCancel();
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {initial ? "Editar descuento" : "Nuevo descuento"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              La promoción se aplica automáticamente en el POS.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            aria-label="Cerrar"
            onClick={onCancel}
            disabled={saving}
          >
            <i className="fas fa-times" />
          </Button>
        </div>

        {(localError || error) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {localError || error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Nombre de la promoción *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Promo Julio"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Tipo *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoDescuento)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="porcentaje">Porcentaje</option>
              <option value="monto_fijo">Monto fijo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Valor *
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.01}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 pr-8 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-2.5 top-2 text-xs text-gray-400">
                {tipo === "porcentaje" ? "%" : "$"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Alcance *
          </label>
          <div className="flex gap-2">
            <label
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                alcance === "producto"
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              <input
                type="radio"
                name="alcance"
                className="mr-1.5"
                checked={alcance === "producto"}
                onChange={() => setAlcance("producto")}
              />
              Producto
            </label>
            <label
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                alcance === "categoria"
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              <input
                type="radio"
                name="alcance"
                className="mr-1.5"
                checked={alcance === "categoria"}
                onChange={() => setAlcance("categoria")}
              />
              Categoría
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Categoría {alcance === "categoria" ? "*" : "(filtro de productos)"}
          </label>
          <select
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.target.value);
              if (alcance === "producto") setProductoId("");
            }}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar categoría...</option>
            {opciones.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {alcance === "producto" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Producto *
            </label>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar producto...</option>
              {productosFiltrados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Fecha inicio *
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Fecha fin *
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          Activo
        </label>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Guardando..." : initial ? "Guardar cambios" : "Crear descuento"}
          </Button>
        </div>
      </form>
    </div>
  );
}
