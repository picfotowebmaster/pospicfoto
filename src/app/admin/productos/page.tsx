"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { RUTAS_PRODUCCION } from "@/lib/utils/constantes";
import type { RutaProduccion } from "@/lib/supabase/types";
import {
  listarCatalogoAdmin,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  guardarProductoAtributos,
  type CatalogoAdmin,
  type ProductoAdmin,
} from "./actions";

export default function ProductosPage() {
  const { showError, showSuccess } = useToast();
  const [catalogo, setCatalogo] = useState<CatalogoAdmin | null>(null);
  const [categoriaSel, setCategoriaSel] = useState<string>("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoProducto, setNuevoProducto] = useState("");
  const [rutaNueva, setRutaNueva] = useState<RutaProduccion>("R1");
  const [mapProducto, setMapProducto] = useState<ProductoAdmin | null>(null);
  const [mapSeleccion, setMapSeleccion] = useState<string[]>([]);
  const [aEliminar, setAEliminar] = useState<
    | { tipo: "categoria"; id: string; nombre: string }
    | { tipo: "producto"; id: string; nombre: string }
    | null
  >(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const data = await listarCatalogoAdmin();
    setCatalogo(data);
    setCategoriaSel((prev) =>
      prev && data.categorias.some((c) => c.id === prev) ? prev : (data.categorias[0]?.id ?? ""),
    );
  }, []);

  useEffect(() => {
    listarCatalogoAdmin()
      .then((data) => {
        setCatalogo(data);
        setCategoriaSel(
          data.categorias[0]?.id ?? "",
        );
      })
      .catch((err) =>
        showError(err instanceof Error ? err.message : "Error al cargar catálogo"),
      );
  }, [showError]);

  const productos = catalogo?.productos.filter((p) => p.categoria_id === categoriaSel) ?? [];

  async function handleAddCategoria() {
    if (!nuevaCategoria.trim()) return;
    try {
      await crearCategoria(nuevaCategoria);
      setNuevaCategoria("");
      await cargar();
      showSuccess("Categoría agregada");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al agregar categoría");
    }
  }

  async function handleAddProducto() {
    if (!nuevoProducto.trim() || !categoriaSel) return;
    try {
      await crearProducto(categoriaSel, nuevoProducto, rutaNueva);
      setNuevoProducto("");
      await cargar();
      showSuccess("Producto agregado");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al agregar producto");
    }
  }

  async function handleToggleCategoria(id: string, activo: boolean) {
    try {
      await actualizarCategoria(id, { activo: !activo });
      await cargar();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al actualizar categoría");
    }
  }

  async function handleToggleProducto(id: string, activo: boolean) {
    try {
      await actualizarProducto(id, { activo: !activo });
      await cargar();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al actualizar producto");
    }
  }

  async function handleCambiarRuta(id: string, ruta: RutaProduccion) {
    try {
      await actualizarProducto(id, { ruta });
      await cargar();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al actualizar ruta");
    }
  }

  function abrirMap(producto: ProductoAdmin) {
    setMapProducto(producto);
    setMapSeleccion(producto.atributo_ids);
  }

  async function guardarMap() {
    if (!mapProducto || guardando) return;
    setGuardando(true);
    try {
      await guardarProductoAtributos(mapProducto.id, mapSeleccion);
      setMapProducto(null);
      await cargar();
      showSuccess("Atributos guardados");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al guardar atributos");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar || guardando) return;
    setGuardando(true);
    try {
      if (aEliminar.tipo === "categoria") {
        await eliminarCategoria(aEliminar.id);
      } else {
        await eliminarProducto(aEliminar.id);
      }
      setAEliminar(null);
      await cargar();
      showSuccess("Eliminado");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase">Categorías</h2>
        <div className="flex gap-2">
          <input
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            placeholder="Nueva categoría..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleAddCategoria()}
          />
          <Button size="sm" onClick={handleAddCategoria}>
            Agregar
          </Button>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {(catalogo?.categorias ?? []).map((c) => (
            <div
              key={c.id}
              onClick={() => setCategoriaSel(c.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
                categoriaSel === c.id
                  ? "bg-blue-50 border border-blue-200"
                  : "hover:bg-gray-50 border border-transparent"
              } ${!c.activo ? "opacity-50" : ""}`}
            >
              <span>{c.nombre}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleCategoria(c.id, c.activo);
                  }}
                >
                  {c.activo ? "✓" : "✕"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Eliminar ${c.nombre}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAEliminar({ tipo: "categoria", id: c.id, nombre: c.nombre });
                  }}
                >
                  <i className="fas fa-trash text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase">
          Productos{catalogo?.categorias.find((c) => c.id === categoriaSel)?.nombre
            ? `: ${catalogo.categorias.find((c) => c.id === categoriaSel)!.nombre}`
            : ""}
        </h2>

        <div className="flex gap-2">
          <input
            value={nuevoProducto}
            onChange={(e) => setNuevoProducto(e.target.value)}
            placeholder="Nuevo producto..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleAddProducto()}
          />
          <select
            value={rutaNueva}
            onChange={(e) => setRutaNueva(e.target.value as RutaProduccion)}
            className="border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RUTAS_PRODUCCION.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleAddProducto} disabled={!categoriaSel}>
            Agregar
          </Button>
        </div>

        <div className="space-y-1 max-h-[28rem] overflow-y-auto">
          {productos.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-transparent hover:bg-gray-50 ${
                !p.activo ? "opacity-50" : ""
              }`}
            >
              <span className="flex-1">{p.nombre}</span>
              <span className="text-xs text-gray-400">
                {p.atributo_ids.length} atributo(s)
              </span>
              <select
                value={p.ruta}
                onChange={(e) => handleCambiarRuta(p.id, e.target.value as RutaProduccion)}
                className="border border-gray-300 rounded-md px-1.5 py-1 text-xs bg-white"
              >
                {RUTAS_PRODUCCION.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.value}
                  </option>
                ))}
              </select>
              <Button variant="ghost" size="sm" onClick={() => abrirMap(p)}>
                Atributos
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleToggleProducto(p.id, p.activo)}>
                {p.activo ? "✓" : "✕"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Eliminar ${p.nombre}`}
                onClick={() => setAEliminar({ tipo: "producto", id: p.id, nombre: p.nombre })}
              >
                <i className="fas fa-trash text-red-500" />
              </Button>
            </div>
          ))}
          {productos.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-8">
              {categoriaSel ? "Sin productos. Agrega uno." : "Selecciona una categoría."}
            </div>
          )}
        </div>
      </div>

      {mapProducto && (
        <div className="fixed inset-0 z-70 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMapProducto(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-5 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              Atributos de “{mapProducto.nombre}”
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Los atributos marcados aparecerán como filtros al vender este producto.
            </p>
            <div className="space-y-1">
              {(catalogo?.atributos ?? []).map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={mapSeleccion.includes(a.id)}
                    onChange={(e) =>
                      setMapSeleccion((prev) =>
                        e.target.checked
                          ? [...prev, a.id]
                          : prev.filter((id) => id !== a.id),
                      )
                    }
                  />
                  <span>{a.nombre}</span>
                  <span className="text-xs text-gray-400">({a.valores.length})</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setMapProducto(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={guardarMap} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={aEliminar !== null}
        title={aEliminar?.tipo === "categoria" ? "Eliminar categoría" : "Eliminar producto"}
        message={`¿Eliminar «${aEliminar?.nombre ?? ""}»?${
          aEliminar?.tipo === "categoria" ? " También se eliminarán sus productos." : ""
        }`}
        confirmLabel={guardando ? "Eliminando..." : "Eliminar"}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
