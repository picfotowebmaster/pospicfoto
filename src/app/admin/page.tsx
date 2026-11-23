"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { fetchAtributos, fetchValores } from "@/lib/services/atributos";
import {
  crearAtributo,
  crearValor,
  toggleAtributoActivo,
  eliminarAtributoSeguro,
  eliminarValor,
  generarPlantillaValoresCsv,
  obtenerUsoValor,
} from "./catalogo/actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { descargarCsv } from "@/lib/utils/descargarCsv";
import { ModalImportarValoresCsv } from "./_components/ModalImportarValoresCsv";
import type { Atributo, AtributoValor } from "@/lib/supabase/types";

export default function AdminPage() {
  const { showError, showSuccess } = useToast();
  const [atributos, setAtributos] = useState<Atributo[]>([]);
  const [selectedAtributo, setSelectedAtributo] = useState<Atributo | null>(null);
  const [valores, setValores] = useState<AtributoValor[]>([]);
  const [nuevoAtributo, setNuevoAtributo] = useState("");
  const [nuevoValor, setNuevoValor] = useState("");
  const [atributoAEliminar, setAtributoAEliminar] = useState<Atributo | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [valorAEliminar, setValorAEliminar] = useState<AtributoValor | null>(
    null,
  );
  const [usoValor, setUsoValor] = useState<{
    valor: string;
    productos: number;
    precios: number;
    afecta_precio: boolean;
  } | null>(null);
  const [consultandoValor, setConsultandoValor] = useState(false);
  const [eliminandoValor, setEliminandoValor] = useState(false);
  const [csvValoresOpen, setCsvValoresOpen] = useState(false);
  const [plantillaCargando, setPlantillaCargando] = useState(false);

  async function cargarAtributos() {
    const data = await fetchAtributos();
    setAtributos(data);
  }

  async function cargarValores(atributoId: string) {
    const data = await fetchValores(atributoId);
    setValores(data);
  }

  useEffect(() => {
    let ignore = false;
    fetchAtributos()
      .then((data) => {
        if (!ignore) setAtributos(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  async function handleAddAtributo() {
    if (!nuevoAtributo.trim()) return;
    try {
      await crearAtributo(nuevoAtributo);
      setNuevoAtributo("");
      await cargarAtributos();
      showSuccess("Atributo agregado");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al agregar atributo");
    }
  }

  async function handleAddValor() {
    if (!nuevoValor.trim() || !selectedAtributo) return;
    try {
      await crearValor(selectedAtributo.id, nuevoValor);
      setNuevoValor("");
      await cargarValores(selectedAtributo.id);
      showSuccess("Valor agregado");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al agregar valor");
    }
  }

  async function handleToggleActivo(atributo: Atributo) {
    try {
      await toggleAtributoActivo(atributo.id, !atributo.activo);
      await cargarAtributos();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al actualizar atributo");
    }
  }

  async function handleConfirmarEliminar() {
    if (!atributoAEliminar || eliminando) return;
    setEliminando(true);
    try {
      await eliminarAtributoSeguro(atributoAEliminar.id);
      if (selectedAtributo?.id === atributoAEliminar.id) {
        setSelectedAtributo(null);
        setValores([]);
      }
      await cargarAtributos();
      showSuccess("Atributo eliminado");
      setAtributoAEliminar(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al eliminar atributo");
    } finally {
      setEliminando(false);
    }
  }

  async function handlePedirEliminarValor(valor: AtributoValor) {
    if (consultandoValor) return;
    setConsultandoValor(true);
    try {
      const uso = await obtenerUsoValor(valor.id);
      if (uso.precios > 0) {
        showError(
          `No se puede eliminar "${valor.valor}": está usado en ${uso.precios} precio(s). Ajusta esos precios antes.`,
        );
        return;
      }
      setUsoValor(uso);
      setValorAEliminar(valor);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Error al revisar el valor",
      );
    } finally {
      setConsultandoValor(false);
    }
  }

  async function handleConfirmarEliminarValor() {
    if (!valorAEliminar || eliminandoValor) return;
    setEliminandoValor(true);
    try {
      await eliminarValor(valorAEliminar.id);
      if (selectedAtributo) {
        await cargarValores(selectedAtributo.id);
      }
      await cargarAtributos();
      showSuccess("Valor eliminado");
      setValorAEliminar(null);
      setUsoValor(null);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Error al eliminar el valor",
      );
    } finally {
      setEliminandoValor(false);
    }
  }

  async function descargarPlantillaValores() {
    if (!selectedAtributo || plantillaCargando) return;
    setPlantillaCargando(true);
    try {
      const plantilla = await generarPlantillaValoresCsv(selectedAtributo.id);
      descargarCsv(
        plantilla.nombreArchivo,
        "\uFEFF" + plantilla.contenido,
      );
      showSuccess("Plantilla de valores descargada");
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Error al generar la plantilla de valores",
      );
    } finally {
      setPlantillaCargando(false);
    }
  }

  function selectAtributo(atributo: Atributo) {
    setSelectedAtributo(atributo);
    cargarValores(atributo.id);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase">
            Atributos
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={nuevoAtributo}
              onChange={(e) => setNuevoAtributo(e.target.value)}
              placeholder="Nuevo atributo..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleAddAtributo()}
            />
            <Button size="sm" onClick={handleAddAtributo}>
              Agregar
            </Button>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto">
            {atributos.map((a) => (
              <div
                key={a.id}
                onClick={() => selectAtributo(a)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
                  selectedAtributo?.id === a.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50 border border-transparent"
                } ${!a.activo ? "opacity-50" : ""}`}
              >
                <span>{a.nombre}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActivo(a);
                    }}
                  >
                    {a.activo ? "✓" : "✕"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Eliminar ${a.nombre}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAtributoAEliminar(a);
                    }}
                  >
                    <i className="fas fa-trash text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-700 text-sm uppercase">
              {selectedAtributo
                ? `Valores: ${selectedAtributo.nombre}`
                : "Selecciona un atributo"}
            </h2>
            {selectedAtributo && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={descargarPlantillaValores}
                  disabled={plantillaCargando}
                >
                  {plantillaCargando ? (
                    <i className="fas fa-spinner fa-spin mr-1.5" />
                  ) : (
                    <i className="fas fa-file-download mr-1.5" />
                  )}
                  Plantilla de valores
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCsvValoresOpen(true)}
                >
                  <i className="fas fa-file-upload mr-1.5" />
                  Importar valores
                </Button>
              </div>
            )}
          </div>

          {selectedAtributo && (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoValor}
                  onChange={(e) => setNuevoValor(e.target.value)}
                  placeholder="Nuevo valor..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAddValor()}
                />
                <Button size="sm" onClick={handleAddValor}>
                  Agregar
                </Button>
              </div>

              <div className="space-y-1 max-h-80 overflow-y-auto">
                {valores.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <span>{v.valor}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Eliminar ${v.valor}`}
                      onClick={() => handlePedirEliminarValor(v)}
                      disabled={consultandoValor}
                    >
                      {consultandoValor ? (
                        <i className="fas fa-spinner fa-spin text-gray-400" />
                      ) : (
                        <i className="fas fa-trash text-red-500" />
                      )}
                    </Button>
                  </div>
                ))}
                {valores.length === 0 && (
                  <div className="text-gray-400 text-sm text-center py-4">
                    Sin valores. Agrega uno nuevo.
                  </div>
                )}
              </div>
            </>
          )}

          {!selectedAtributo && (
            <div className="text-gray-400 text-sm text-center py-12">
              Selecciona un atributo de la izquierda para ver sus valores.
            </div>
          )}
        </div>

        <ConfirmModal
          open={atributoAEliminar !== null}
          title="Eliminar atributo"
          message={`¿Eliminar «${atributoAEliminar?.nombre ?? ""}»? También se eliminarán todos sus valores. Si algún valor está usado en precios, la operación se bloqueará.`}
          confirmLabel={eliminando ? "Eliminando..." : "Eliminar"}
          onConfirm={handleConfirmarEliminar}
          onCancel={() => setAtributoAEliminar(null)}
        />

        <ConfirmModal
          open={valorAEliminar !== null}
          title="Eliminar valor"
          message={
            usoValor
              ? `¿Eliminar «${valorAEliminar?.valor ?? ""}»? Se quitará de ${usoValor.productos} producto(s). No está usado en precios.`
              : "¿Eliminar este valor?"
          }
          confirmLabel={eliminandoValor ? "Eliminando..." : "Eliminar"}
          onConfirm={handleConfirmarEliminarValor}
          onCancel={() => {
            if (eliminandoValor) return;
            setValorAEliminar(null);
            setUsoValor(null);
          }}
        />

        {csvValoresOpen && selectedAtributo && (
          <ModalImportarValoresCsv
            open
            atributoId={selectedAtributo.id}
            atributoNombre={selectedAtributo.nombre}
            onClose={() => setCsvValoresOpen(false)}
            onApplied={async () => {
              await cargarValores(selectedAtributo.id);
              await cargarAtributos();
            }}
          />
        )}
      </div>
  );
}
