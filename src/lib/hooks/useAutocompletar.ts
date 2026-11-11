"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface AutocompletarOptions<T> {
  fetchFn: (termino: string) => Promise<T[]>;
  onSelect: (item: T) => void;
  renderItem: (item: T) => string;
  minChars?: number;
  idFromItem?: (item: T) => string;
}

export function useAutocompletar<T>({
  fetchFn,
  onSelect,
  renderItem,
  minChars = 2,
}: AutocompletarOptions<T>) {
  const [termino, setTermino] = useState("");
  const [opciones, setOpciones] = useState<T[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(
    (t: string) => {
      setTermino(t);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (t.length < minChars) {
        setOpciones([]);
        setAbierto(false);
        setCargando(false);
        return;
      }
      timeoutRef.current = setTimeout(async () => {
        setCargando(true);
        try {
          const res = await fetchFn(t);
          setOpciones(res);
          setAbierto(res.length > 0);
          setIndiceSeleccionado(-1);
        } catch {
          setOpciones([]);
        } finally {
          setCargando(false);
        }
      }, 250);
    },
    [fetchFn, minChars],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const seleccionar = useCallback(
    (item: T) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTermino(renderItem(item));
      setAbierto(false);
      setOpciones([]);
      onSelect(item);
    },
    [onSelect, renderItem],
  );

  const tecla = useCallback(
    (e: React.KeyboardEvent) => {
      if (!abierto) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndiceSeleccionado((prev) =>
          prev < opciones.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndiceSeleccionado((prev) =>
          prev > 0 ? prev - 1 : opciones.length - 1,
        );
      } else if (e.key === "Enter" && indiceSeleccionado >= 0) {
        e.preventDefault();
        seleccionar(opciones[indiceSeleccionado]);
      } else if (e.key === "Escape") {
        setAbierto(false);
      }
    },
    [abierto, opciones, indiceSeleccionado, seleccionar],
  );

  useEffect(() => {
    function clickFuera(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", clickFuera);
    return () => document.removeEventListener("mousedown", clickFuera);
  }, []);

  return {
    termino,
    opciones,
    abierto,
    cargando,
    indiceSeleccionado,
    containerRef,
    inputRef,
    buscar,
    seleccionar,
    tecla,
    setTermino,
  };
}

export type { AutocompletarOptions };
