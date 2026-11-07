"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { LineaPedidoDraft, MetodoPago, RutaProduccion } from "@/lib/supabase/types";
import { sumarLineas, calcularAnticipo, generarIdLocal } from "@/lib/utils/calculos";
import { ANTICIPO_POR_DEFECTO } from "@/lib/utils/constantes";
import { cpValido, rfcValido } from "@/lib/utils/fiscal";
import { savePedidoDraft, getPedidoDraft, clearPedidoDraft } from "@/lib/offline/db";

interface ClienteData {
  nombre: string;
  telefono: string;
  email: string;
  fechaEntrega: string;
  horaEntrega: string;
  requiereFactura: boolean;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCfdi: string;
  cpFiscal: string;
}

const CLIENTE_VACIO: ClienteData = {
  nombre: "",
  telefono: "",
  email: "",
  fechaEntrega: "",
  horaEntrega: "",
  requiereFactura: false,
  rfc: "",
  razonSocial: "",
  regimenFiscal: "",
  usoCfdi: "",
  cpFiscal: "",
};

export function usePedidoActual(
  sucursalId: string,
  entidadEmisoraId = "",
  marcaEntidadId = "",
) {
  const [cliente, setCliente] = useState<ClienteData>({ ...CLIENTE_VACIO });
  const [lineas, setLineas] = useState<LineaPedidoDraft[]>([]);
  const [porcentajeAnticipo, setPorcentajeAnticipo] = useState(ANTICIPO_POR_DEFECTO);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Efectivo");
  const [rutaDefault, setRutaDefault] = useState<RutaProduccion>("R1");
  const [marcaId, setMarcaId] = useState("");
  const marcaIdActual = marcaEntidadId || marcaId;
  const [draftRestored, setDraftRestored] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDraftSnapshot = useCallback(
    () => ({
      cliente,
      lineas,
      porcentajeAnticipo,
      metodoPago,
      ruta: rutaDefault,
      marcaId: marcaIdActual,
      entidadEmisoraId,
    }),
    [
      cliente,
      lineas,
      porcentajeAnticipo,
      metodoPago,
      rutaDefault,
      marcaIdActual,
      entidadEmisoraId,
    ],
  );

  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      savePedidoDraft(getDraftSnapshot() as unknown as Record<string, unknown>).catch(() => {});
    }, 500);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [getDraftSnapshot]);

  const restoreDraft = useCallback(async () => {
    try {
      const draft = await getPedidoDraft();
      if (draft) {
        const d = draft as Record<string, unknown>;
        if (d.cliente) {
          setCliente((prev) => ({
            ...prev,
            ...(d.cliente as Partial<ClienteData>),
          }));
        }
        if (d.lineas) setLineas(d.lineas as LineaPedidoDraft[]);
        if (typeof d.porcentajeAnticipo === "number") setPorcentajeAnticipo(d.porcentajeAnticipo as number);
        if (typeof d.metodoPago === "string") setMetodoPago(d.metodoPago as MetodoPago);
        if (typeof d.ruta === "string") setRutaDefault(d.ruta as RutaProduccion);
        if (!marcaEntidadId && typeof d.marcaId === "string") {
          setMarcaId(d.marcaId as string);
        }
      }
    } catch {
      // silencioso
    }
    setDraftRestored(true);
  }, [marcaEntidadId]);

  const subtotal = sumarLineas(lineas);
  const anticipo = calcularAnticipo(subtotal, porcentajeAnticipo);
  const total = subtotal;

  const agregarLinea = useCallback((linea: Omit<LineaPedidoDraft, "id">) => {
    const nueva: LineaPedidoDraft = { ...linea, id: generarIdLocal() };
    setLineas((prev) => [...prev, nueva]);
    return nueva;
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
    setCliente({ ...CLIENTE_VACIO });
    setLineas([]);
    setPorcentajeAnticipo(ANTICIPO_POR_DEFECTO);
    setMetodoPago("Efectivo");
    setRutaDefault("R1");
    clearPedidoDraft().catch(() => {});
  }, []);

  const rutasUnicas = useMemo(() => {
    const set = new Set(lineas.map((l) => l.ruta));
    return [...set] as RutaProduccion[];
  }, [lineas]);

  const getLineasPorRuta = useCallback(
    () => {
      const groups: Record<string, LineaPedidoDraft[]> = {};
      for (const l of lineas) {
        if (!groups[l.ruta]) groups[l.ruta] = [];
        groups[l.ruta].push(l);
      }
      return groups;
    },
    [lineas],
  );

  const facturaValida =
    !cliente.requiereFactura ||
    (cliente.email.trim() !== "" &&
      rfcValido(cliente.rfc) &&
      cliente.razonSocial.trim() !== "" &&
      cliente.regimenFiscal !== "" &&
      cliente.usoCfdi !== "" &&
      cpValido(cliente.cpFiscal));

  const valido =
    cliente.nombre.trim() !== "" &&
    cliente.fechaEntrega !== "" &&
    cliente.horaEntrega !== "" &&
    sucursalId !== "" &&
    entidadEmisoraId !== "" &&
    marcaIdActual !== "" &&
    facturaValida &&
    lineas.length > 0 &&
    lineas.every(
      (l) =>
        l.producto_nombre.trim() !== "" &&
        l.cantidad > 0 &&
        l.precio_unitario > 0 &&
        !!l.ruta,
    );

  const pendientes: string[] = [];
  if (cliente.nombre.trim() === "") pendientes.push("Nombre del cliente");
  if (cliente.fechaEntrega === "") pendientes.push("Fecha de entrega");
  if (cliente.horaEntrega === "") pendientes.push("Hora de entrega");
  if (entidadEmisoraId === "")
    pendientes.push("Razón social / Sucursal asignada");
  if (sucursalId === "") pendientes.push("Sucursal asignada");
  if (marcaIdActual === "") pendientes.push("Marca");
  if (cliente.requiereFactura) {
    if (cliente.email.trim() === "") pendientes.push("Correo para factura");
    if (!rfcValido(cliente.rfc)) pendientes.push("RFC válido");
    if (cliente.razonSocial.trim() === "") pendientes.push("Razón social");
    if (cliente.regimenFiscal === "") pendientes.push("Régimen fiscal");
    if (cliente.usoCfdi === "") pendientes.push("Uso de CFDI");
    if (!cpValido(cliente.cpFiscal)) pendientes.push("CP fiscal");
  }
  if (lineas.length === 0) pendientes.push("Al menos un producto");
  else if (
    lineas.some(
      (l) =>
        l.producto_nombre.trim() === "" ||
        l.cantidad <= 0 ||
        l.precio_unitario <= 0 ||
        !l.ruta,
    )
  )
    pendientes.push("Producto con cantidad y precio válidos");

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
    rutaDefault,
    setRutaDefault,
    rutasUnicas,
    getLineasPorRuta,
    sucursalId,
    entidadEmisoraId,
    marcaId: marcaIdActual,
    setMarcaId,
    valido,
    pendientes,
    draftRestored,
    restoreDraft,
  };
}
