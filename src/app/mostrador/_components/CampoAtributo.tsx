"use client";

import React from "react";
import { Autocompletar } from "@/components/ui/Autocompletar";
import type { Atributo, AtributoValor } from "@/lib/supabase/types";

interface CampoAtributoProps {
  atributo: Atributo;
  valor: string;
  valores: AtributoValor[];
  onChange: (valor: string) => void;
}

export function CampoAtributo({
  atributo,
  valor,
  valores,
  onChange,
}: CampoAtributoProps) {
  const [termino, setTermino] = React.useState(valor);
  const [abierto, setAbierto] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtrados = termino
    ? valores.filter((v) =>
        v.valor.toLowerCase().includes(termino.toLowerCase()),
      )
    : valores;

  React.useEffect(() => {
    setTermino(valor);
  }, [valor]);

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
