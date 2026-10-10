"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { RUTAS_PRODUCCION } from "@/lib/utils/constantes";
import type { AtributoValor, RutaProduccion } from "@/lib/supabase/types";
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
  type ProductoAtributoAdmin,
} from "./actions";

export default function ProductosPage() {
  const { showError, showSuccess } = useToast();
  const [catalogo, setCatalogo] = useState<CatalogoAdmin | null>(null);
  const [categoriaSel, setCategoriaSel] = useState<string>("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoProducto, setNuevoProducto] = useState("");
  const [rutaNueva, setRutaNueva] = useState<RutaProduccion>("R1");
  const [mapProducto, setMapProducto] = useState<ProductoAdmin | null>(null);
  const [mapSeleccion, setMapSeleccion] = useState<ProductoAtributoAdmin[]>([]);
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
    setMapSeleccion(producto.atributos);
  }

  function valoresDeAtributo(atributoId: string): AtributoValor[] {
    return catalogo?.atributos.find((a) => a.id === atributoId)?.valores ?? [];
  }

  function toggleMapAtributo(atributoId: string, incluido: boolean) {
    setMapSeleccion((prev) =>
      incluido
        ? [
            ...prev,
            {
              atributo_id: atributoId,
              requerido: false,
              valor_ids: valoresDeAtributo(atributoId).map((v) => v.id),
            },
          ]
        : prev.filter((a) => a.atributo_id !== atributoId),
    );
  }

  function toggleMapValor(atributoId: string, valorId: string, incluido: boolean) {
    setMapSeleccion((prev) =>
      prev.map((a) => {
        if (a.atributo_id !== atributoId) return a;
        return incluido
          ? { ...a, valor_ids: [...a.valor_ids, valorId] }
          : { ...a, valor_ids: a.valor_ids.filter((v) => v !== valorId) };
      }),
    );
  }

  function marcarTodosValores(atributoId: string, todos: boolean) {
    setMapSeleccion((prev) =>
      prev.map((a) =>
        a.atributo_id === atributoId
          ? { ...a, valor_ids: todos ? valoresDeAtributo(atributoId).map((v) => v.id) : [] }
          : a,
      ),
    );
  }

  function moverMapValor(atributoId: string, valorId: string, dir: -1 | 1) {
    setMapSeleccion((prev) =>
      prev.map((a) => {
        if (a.atributo_id !== atributoId) return a;
        const i = a.valor_ids.indexOf(valorId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= a.valor_ids.length) return a;
        const next = [...a.valor_ids];
        [next[i], next[j]] = [next[j], next[i]];
        return { ...a, valor_ids: next };
      }),
    );
  }

  function moverMapAtributo(atributoId: string, dir: -1 | 1) {
    setMapSeleccion((prev) => {
      const i = prev.findIndex((a) => a.atributo_id === atributoId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function setMapRequerido(atributoId: string, requerido: boolean) {
    setMapSeleccion((prev) =>
      prev.map((a) => (a.atributo_id === atributoId ? { ...a, requerido } : a)),
    );
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
                {p.atributos.length} atributo(s)
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
              Ordena los atributos y, dentro de cada uno, marca y ordena los
              valores como aparecen en la web. Marca «Req.» si el cajero debe
              elegir un valor para continuar.
            </p>
            <div className="space-y-1">
              {(catalogo?.atributos ?? []).map((a) => {
                const idx = mapSeleccion.findIndex((s) => s.atributo_id === a.id);
                const seleccionado = idx >= 0;
                const valoresAttr = a.valores;
                const valorIds = seleccionado ? mapSeleccion[idx].valor_ids : [];
                return (
                  <div
                    key={a.id}
                    className="rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={seleccionado}
                        onChange={(e) => toggleMapAtributo(a.id, e.target.checked)}
                      />
                      <span className="flex-1 cursor-pointer" onClick={() => toggleMapAtributo(a.id, !seleccionado)}>
                        {a.nombre}
                        <span className="text-xs text-gray-400"> ({a.valores.length})</span>
                      </span>
                      {seleccionado && (
                        <>
                          <span className="text-xs text-gray-400 font-mono">#{idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Subir"
                            disabled={idx === 0}
                            onClick={() => moverMapAtributo(a.id, -1)}
                          >
                            <i className="fas fa-arrow-up" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Bajar"
                            disabled={idx === mapSeleccion.length - 1}
                            onClick={() => moverMapAtributo(a.id, 1)}
                          >
                            <i className="fas fa-arrow-down" />
                          </Button>
                          <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mapSeleccion[idx].requerido}
                              onChange={(e) => setMapRequerido(a.id, e.target.checked)}
                            />
                            Req.
                          </label>
                        </>
                      )}
                    </div>
                    {seleccionado && (
                      <div className="ml-6 mb-2 border-l-2 border-gray-100 dark:border-gray-800 pl-3 space-y-0.5">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>
                            Valores ({valorIds.length}/{valoresAttr.length})
                          </span>
                          <button
                            type="button"
                            className="text-blue-600 hover:underline"
                            onClick={() => marcarTodosValores(a.id, true)}
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            className="text-blue-600 hover:underline"
                            onClick={() => marcarTodosValores(a.id, false)}
                          >
                            Ninguno
                          </button>
                        </div>
                        {valoresAttr.map((v) => {
                          const vIdx = valorIds.indexOf(v.id);
                          const marcado = vIdx >= 0;
                          return (
                            <div key={v.id} className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={marcado}
                                onChange={(e) => toggleMapValor(a.id, v.id, e.target.checked)}
                              />
                              <span className={`flex-1 ${marcado ? "" : "text-gray-400"}`}>
                                {v.valor}
                              </span>
                              {marcado && (
                                <>
                                  <span className="text-gray-400 font-mono">#{vIdx + 1}</span>
                                  <button
                                    type="button"
                                    aria-label="Subir valor"
                                    disabled={vIdx === 0}
                                    onClick={() => moverMapValor(a.id, v.id, -1)}
                                    className="text-gray-500 disabled:opacity-30"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Bajar valor"
                                    disabled={vIdx === valorIds.length - 1}
                                    onClick={() => moverMapValor(a.id, v.id, 1)}
                                    className="text-gray-500 disabled:opacity-30"
                                  >
                                    ↓
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                        {valoresAttr.length === 0 && (
                          <div className="text-xs text-gray-400">Sin valores en este atributo.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
