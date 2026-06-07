"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  fetchAtributos,
  fetchValores,
  insertAtributo,
  insertAtributoValor,
  toggleAtributoActivo,
} from "@/lib/services/atributos";
import type { Atributo, AtributoValor } from "@/lib/supabase/types";

export default function AdminPage() {
  const [atributos, setAtributos] = useState<Atributo[]>([]);
  const [selectedAtributo, setSelectedAtributo] = useState<Atributo | null>(null);
  const [valores, setValores] = useState<AtributoValor[]>([]);
  const [nuevoAtributo, setNuevoAtributo] = useState("");
  const [nuevoValor, setNuevoValor] = useState("");

  async function cargarAtributos() {
    const data = await fetchAtributos();
    setAtributos(data);
  }

  async function cargarValores(atributoId: string) {
    const data = await fetchValores(atributoId);
    setValores(data);
  }

  useEffect(() => {
    cargarAtributos();
  }, []);

  async function handleAddAtributo() {
    if (!nuevoAtributo.trim()) return;
    await insertAtributo(nuevoAtributo.trim());
    setNuevoAtributo("");
    cargarAtributos();
  }

  async function handleAddValor() {
    if (!nuevoValor.trim() || !selectedAtributo) return;
    await insertAtributoValor(selectedAtributo.id, nuevoValor.trim());
    setNuevoValor("");
    cargarValores(selectedAtributo.id);
  }

  async function handleToggleActivo(atributo: Atributo) {
    await toggleAtributoActivo(atributo.id, !atributo.activo);
    cargarAtributos();
  }

  function selectAtributo(atributo: Atributo) {
    setSelectedAtributo(atributo);
    cargarValores(atributo.id);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase">Atributos</h2>

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
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase">
            {selectedAtributo
              ? `Valores: ${selectedAtributo.nombre}`
              : "Selecciona un atributo"}
          </h2>

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
                    className="px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  >
                    {v.valor}
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
      </div>
  );
}
