"use client";

import React from "react";

interface AutocompletarProps<T> {
  placeholder: string;
  valor: string;
  onChange: (valor: string) => void;
  opciones: T[];
  renderOpcion: (item: T) => string;
  onSelect: (item: T) => void;
  abierto: boolean;
  cargando: boolean;
  indiceSeleccionado: number;
  onKeyDown: (e: React.KeyboardEvent) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  className?: string;
  permitirLibre?: boolean;
  idFromItem?: (item: T) => string;
}

export function Autocompletar<T>({
  placeholder,
  valor,
  onChange,
  opciones,
  renderOpcion,
  onSelect,
  abierto,
  cargando,
  indiceSeleccionado,
  onKeyDown,
  containerRef,
  inputRef,
  className = "",
  idFromItem,
}: AutocompletarProps<T>) {
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {cargando && (
        <div className="absolute right-3 top-2.5">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {abierto && opciones.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {opciones.map((opcion, idx) => (
            <li
              key={idFromItem ? idFromItem(opcion) : idx}
              onMouseDown={() => onSelect(opcion)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                idx === indiceSeleccionado ? "bg-blue-100" : ""
              }`}
            >
              {renderOpcion(opcion)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
