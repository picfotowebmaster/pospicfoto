"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type {
  LineaPedidoDraft,
  MetodoPago,
  PagoDraft,
  RutaProduccion,
} from "@/lib/supabase/types";
import {
  sumarLineas,
  calcularAnticipo,
  normalizarAnticipoManual,
  generarIdLocal,
} from "@/lib/utils/calculos";
import { ANTICIPO_POR_DEFECTO } from "@/lib/utils/constantes";
import {
  escalarPagos,
  resumenMetodoPago,
  TOLERANCIA_PAGO,
  validarPagos,
} from "@/lib/utils/pagos";

interface PagosDivididosState {
  base: number;
  pagos: PagoDraft[];
}
import { cpValido, rfcValido } from "@/lib/utils/fiscal";
import { savePedidoDraft, getPedidoDraft, clearPedidoDraft } from "@/lib/offline/db";
import { facturacionHabilitada } from "@/lib/config/features";

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

  const actualizarCliente = useCallback((cambios: Partial<ClienteData>) => {
    setCliente((prev) => ({ ...prev, ...cambios }));
  }, []);
  const [lineas, setLineas] = useState<LineaPedidoDraft[]>([]);
  const [porcentajeAnticipo, setPorcentajeAnticipoState] = useState(ANTICIPO_POR_DEFECTO);
  const [anticipoManual, setAnticipoManualState] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Efectivo");
  const [pagosDivididos, setPagosDivididos] =
    useState<PagosDivididosState | null>(null);
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
      anticipoManual,
      metodoPago,
      pagosAnticipo: pagosDivididos,
      ruta: rutaDefault,
      marcaId: marcaIdActual,
      entidadEmisoraId,
    }),
    [
      cliente,
      lineas,
      porcentajeAnticipo,
      anticipoManual,
      metodoPago,
      pagosDivididos,
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
        if (typeof d.porcentajeAnticipo === "number") {
          setPorcentajeAnticipoState(d.porcentajeAnticipo);
        }
        if (typeof d.anticipoManual === "number") {
          setAnticipoManualState(d.anticipoManual);
        } else if (d.anticipoManual === null) {
          setAnticipoManualState(null);
        }
        if (typeof d.metodoPago === "string") setMetodoPago(d.metodoPago as MetodoPago);
        if (Array.isArray(d.pagosAnticipo)) {
          setPagosDivididos({ base: 0, pagos: d.pagosAnticipo as PagoDraft[] });
        } else if (
          d.pagosAnticipo &&
          typeof d.pagosAnticipo === "object" &&
          Array.isArray((d.pagosAnticipo as PagosDivididosState).pagos)
        ) {
          setPagosDivididos(d.pagosAnticipo as PagosDivididosState);
        } else if (d.pagosAnticipo === null) {
          setPagosDivididos(null);
        }
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
  const anticipo =
    anticipoManual !== null
      ? normalizarAnticipoManual(anticipoManual, subtotal)
      : calcularAnticipo(subtotal, porcentajeAnticipo);
  const total = subtotal;

  const setPorcentajeAnticipo = useCallback((porcentaje: number) => {
    setPorcentajeAnticipoState(porcentaje);
    setAnticipoManualState(null);
  }, []);

  const usarMontoManual = useCallback(() => {
    setAnticipoManualState((prev) => prev ?? anticipo);
  }, [anticipo]);

  const setAnticipoManual = useCallback((monto: number) => {
    const valor = Number(monto);
    setAnticipoManualState(Number.isFinite(valor) ? valor : 0);
  }, []);

  const pagosAnticipo = useMemo<PagoDraft[]>(() => {
    if (anticipo <= 0) return [];
    if (!pagosDivididos) return [{ metodo: metodoPago, monto: anticipo }];
    if (Math.abs(pagosDivididos.base - anticipo) <= TOLERANCIA_PAGO) {
      return pagosDivididos.pagos;
    }
    return escalarPagos(pagosDivididos.pagos, anticipo);
  }, [anticipo, metodoPago, pagosDivididos]);

  const dividirPago = pagosDivididos !== null;
  const validacionPagos = validarPagos(pagosAnticipo, anticipo);

  const activarPagoDividido = useCallback(() => {
    setPagosDivididos(
      (prev) =>
        prev ?? {
          base: anticipo,
          pagos: anticipo > 0 ? [{ metodo: metodoPago, monto: anticipo }] : [],
        },
    );
  }, [anticipo, metodoPago]);

  const desactivarPagoDividido = useCallback(() => {
    if (pagosDivididos && pagosDivididos.pagos.length > 0) {
      setMetodoPago(resumenMetodoPago(pagosDivididos.pagos, metodoPago));
    }
    setPagosDivididos(null);
  }, [pagosDivididos, metodoPago]);

  const actualizarPagosDivididos = useCallback(
    (pagos: PagoDraft[]) => {
      setPagosDivididos({ base: anticipo, pagos });
    },
    [anticipo],
  );

  const cambiarMetodoPago = useCallback((metodo: MetodoPago) => {
    setMetodoPago(metodo);
    setPagosDivididos(null);
  }, []);

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
    setPorcentajeAnticipoState(ANTICIPO_POR_DEFECTO);
    setAnticipoManualState(null);
    setMetodoPago("Efectivo");
    setPagosDivididos(null);
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
    !facturacionHabilitada() ||
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
    (anticipo <= 0 || validacionPagos.valido) &&
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
    pendientes.push("Entidad emisora asignada");
  if (sucursalId === "") pendientes.push("Sucursal asignada");
  if (marcaIdActual === "") pendientes.push("Marca");
  if (facturacionHabilitada() && cliente.requiereFactura) {
    if (cliente.email.trim() === "") pendientes.push("Correo para factura");
    if (!rfcValido(cliente.rfc)) pendientes.push("RFC válido");
    if (cliente.razonSocial.trim() === "") pendientes.push("Razón social");
    if (cliente.regimenFiscal === "") pendientes.push("Régimen fiscal");
    if (cliente.usoCfdi === "") pendientes.push("Uso de CFDI");
    if (!cpValido(cliente.cpFiscal)) pendientes.push("CP fiscal");
  }
  if (anticipo > 0 && dividirPago && !validacionPagos.valido) {
    pendientes.push("El pago dividido debe sumar el anticipo");
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
    actualizarCliente,
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
    anticipoManual,
    esAnticipoManual: anticipoManual !== null,
    usarMontoManual,
    setAnticipoManual,
    metodoPago,
    setMetodoPago: cambiarMetodoPago,
    pagosAnticipo,
    dividirPago,
    activarPagoDividido,
    desactivarPagoDividido,
    setPagosAnticipo: actualizarPagosDivididos,
    validacionPagos,
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
