"use client";

import React from "react";
import { Autocompletar } from "@/components/ui/Autocompletar";
import type { Atributo, AtributoValor } from "@/lib/supabase/types";

interface CampoAtributoProps {
  atributo: Atributo;
  valor: string;
  valores: AtributoValor[];
  onChange: (valor: string) => void;
  variante?: "select" | "libre";
}

function SelectAtributo({
  atributo,
  valor,
  valores,
  onChange,
}: CampoAtributoProps) {
  const enLista = valores.some((v) => v.valor === valor);
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {atributo.nombre}
      </label>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Elige una opción…</option>
        {!enLista && valor && <option value={valor}>{valor}</option>}
        {valores.map((v) => (
          <option key={v.id} value={v.valor}>
            {v.valor}
          </option>
        ))}
      </select>
    </div>
  );
}

function LibreAtributo({ atributo, valor, valores, onChange }: CampoAtributoProps) {
  const [termino, setTermino] = React.useState(valor);
  const [prevValor, setPrevValor] = React.useState(valor);
  const [abierto, setAbierto] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (valor !== prevValor) {
    setPrevValor(valor);
    setTermino(valor);
  }

  const filtrados = termino
    ? valores.filter((v) =>
        v.valor.toLowerCase().includes(termino.toLowerCase()),
      )
    : valores;

  React.useEffect(() => {
    function clickFuera(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", clickFuera);
    return () => document.removeEventListener("mousedown", clickFuera);
  }, []);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {atributo.nombre}
      </label>
      <Autocompletar
        placeholder={`${atributo.nombre}...`}
        valor={termino}
        onChange={(v) => {
          setTermino(v);
          setAbierto(v.length > 0 || filtrados.length > 0);
        }}
        opciones={filtrados.slice(0, 8)}
        renderOpcion={(v) => v.valor}
        onSelect={(v) => {
          onChange(v.valor);
          setTermino(v.valor);
          setAbierto(false);
        }}
        abierto={abierto && filtrados.length > 0}
        cargando={false}
        indiceSeleccionado={-1}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(termino);
            setAbierto(false);
          }
          if (e.key === "Escape") setAbierto(false);
        }}
        containerRef={containerRef}
        inputRef={inputRef}
        idFromItem={(v) => v.id}
      />
    </div>
  );
}

export function CampoAtributo(props: CampoAtributoProps) {
  return props.variante === "libre" ? (
    <LibreAtributo {...props} />
  ) : (
    <SelectAtributo {...props} />
  );
}
