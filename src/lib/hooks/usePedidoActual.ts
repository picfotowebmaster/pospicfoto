"use client";

import { useState, useCallback } from "react";
import type { LineaPedidoDraft, MetodoPago, RutaProduccion } from "@/lib/supabase/types";
import { sumarLineas, calcularAnticipo, generarIdLocal } from "@/lib/utils/calculos";
import { ANTICIPO_POR_DEFECTO } from "@/lib/utils/constantes";

interface ClienteData {
  nombre: string;
  telefono: string;
  fechaEntrega: string;
  horaEntrega: string;
  requiereCorreccion: boolean;
}

export function usePedidoActual(sucursalId: string) {
  const [cliente, setCliente] = useState<ClienteData>({
    nombre: "",
    telefono: "",
    fechaEntrega: "",
    horaEntrega: "",
    requiereCorreccion: false,
  });
  const [lineas, setLineas] = useState<LineaPedidoDraft[]>([]);
  const [porcentajeAnticipo, setPorcentajeAnticipo] = useState(ANTICIPO_POR_DEFECTO);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Efectivo");
  const [ruta, setRuta] = useState<RutaProduccion>("R1");
  const [marcaId, setMarcaId] = useState("");

  const subtotal = sumarLineas(lineas);
  const anticipo = calcularAnticipo(subtotal, porcentajeAnticipo);
  const total = subtotal;

  const agregarLinea = useCallback((linea: Omit<LineaPedidoDraft, "id">) => {
    setLineas((prev) => [
      ...prev,
      { ...linea, id: generarIdLocal() },
    ]);
  }, []);

  const eliminarLinea = useCallback((id: string) => {
    setLineas((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const actualizarLinea = useCallback(
    (id: string, updates: Partial<LineaPedidoDraft>) => {
      setLineas((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      );
    },
    [],
  );

  const limpiar = useCallback(() => {
    setCliente({
      nombre: "",
      telefono: "",
      fechaEntrega: "",
      horaEntrega: "",
      requiereCorreccion: false,
    });
    setLineas([]);
    setPorcentajeAnticipo(ANTICIPO_POR_DEFECTO);
    setMetodoPago("Efectivo");
    setRuta("R1");
  }, []);

  const valido =
    cliente.nombre.trim() !== "" &&
    cliente.fechaEntrega !== "" &&
    cliente.horaEntrega !== "" &&
    sucursalId !== "" &&
    marcaId !== "" &&
    lineas.length > 0 &&
    lineas.every(
      (l) =>
        l.producto_nombre.trim() !== "" &&
        l.cantidad > 0 &&
        l.precio_unitario > 0,
    );

  return {
    cliente,
    setCliente,
    lineas,
    agregarLinea,
    eliminarLinea,
    actualizarLinea,
    limpiar,
    subtotal,
    anticipo,
    total,
    porcentajeAnticipo,
    setPorcentajeAnticipo,
    metodoPago,
    setMetodoPago,
    ruta,
    setRuta,
    sucursalId,
    marcaId,
    setMarcaId,
    valido,
  };
}
