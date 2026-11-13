"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { obtenerPedidosReporte } from "@/lib/services/reportesContables";
import {
  construirReporteContable,
  type PedidoReporteContable,
} from "@/lib/utils/reportesContables";
import {
  calcularRangoPeriodo,
  type PeriodoKey,
} from "@/lib/utils/periodos";
import {
  indexarVendedores,
  listarVendedores,
  vendedoresParaFiltro,
  type Vendedor,
} from "@/lib/services/vendedores";

interface OpcionesReportesContables {
  sucursalFijo?: string | null;
  restringido?: boolean;
}

export function useReportesContables(
  opciones: OpcionesReportesContables = {},
) {
  const { sucursalFijo, restringido = false } = opciones;
  const sinSucursal = restringido && !sucursalFijo;
  const [periodo, setPeriodoState] = useState<PeriodoKey>("mes");
  const [desdeCustom, setDesdeCustomState] = useState("");
  const [hastaCustom, setHastaCustomState] = useState("");
  const [metodoPago, setMetodoPagoState] = useState("");
  const [vendedorId, setVendedorIdState] = useState("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [pedidos, setPedidos] = useState<PedidoReporteContable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (sinSucursal) return;
    let ignore = false;

    listarVendedores(sucursalFijo ?? undefined)
      .then((data) => {
        if (!ignore) setVendedores(data);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [sucursalFijo, sinSucursal]);

  const rango = useMemo(
    () =>
      calcularRangoPeriodo(periodo, {
        desde: desdeCustom,
        hasta: hastaCustom,
      }),
    [periodo, desdeCustom, hastaCustom],
  );

  const rangoValido =
    periodo !== "personalizado" ||
    (desdeCustom !== "" && hastaCustom !== "" && desdeCustom <= hastaCustom);

  useEffect(() => {
    if (!rangoValido || sinSucursal) return;
    let ignore = false;

    obtenerPedidosReporte(
      { desde: rango.desde, hasta: rango.hasta },
      sucursalFijo ?? undefined,
    )
      .then((data) => {
        if (ignore) return;
        setPedidos(data);
        setError(null);
        setCargando(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const mensaje =
          (err instanceof Error && err.message) ||
          ((err as Record<string, unknown>)?.message as string) ||
          "Error al cargar el reporte contable.";
        setError(mensaje);
        setPedidos([]);
        setCargando(false);
      });

    return () => {
      ignore = true;
    };
  }, [rango.desde, rango.hasta, rangoValido, trigger, sucursalFijo, sinSucursal]);

  const nombresVendedores = useMemo(
    () => indexarVendedores(vendedores),
    [vendedores],
  );

  const reporte = useMemo(
    () =>
      construirReporteContable(pedidos, rango, metodoPago, {
        vendedorId,
        nombresVendedores,
      }),
    [pedidos, rango, metodoPago, vendedorId, nombresVendedores],
  );

  const setPeriodo = useCallback(
    (opcion: PeriodoKey) => {
      if (opcion === periodo) return;

      setPeriodoState(opcion);
      setError(null);
      setCargando(true);

      if (
        opcion === "personalizado" &&
        (desdeCustom === "" || hastaCustom === "")
      ) {
        const inicial = calcularRangoPeriodo("mes");
        setDesdeCustomState(inicial.desde);
        setHastaCustomState(inicial.hasta);
      }
    },
    [periodo, desdeCustom, hastaCustom],
  );

  const setDesdeCustom = useCallback(
    (valor: string) => {
      setDesdeCustomState(valor);
      setError(null);
      const valido =
        valor !== "" && hastaCustom !== "" && valor <= hastaCustom;
      setCargando(valido);
      if (!valido) setPedidos([]);
    },
    [hastaCustom],
  );

  const setHastaCustom = useCallback(
    (valor: string) => {
      setHastaCustomState(valor);
      setError(null);
      const valido =
        valor !== "" && desdeCustom !== "" && desdeCustom <= valor;
      setCargando(valido);
      if (!valido) setPedidos([]);
    },
    [desdeCustom],
  );

  const setMetodoPago = useCallback((valor: string) => {
    setMetodoPagoState(valor);
  }, []);

  const setVendedorId = useCallback((valor: string) => {
    setVendedorIdState(valor);
  }, []);

  const recargar = useCallback(() => {
    if (!rangoValido || sinSucursal) return;
    setCargando(true);
    setError(null);
    setTrigger((valor) => valor + 1);
  }, [rangoValido, sinSucursal]);

  return {
    periodo,
    setPeriodo,
    desdeCustom,
    setDesdeCustom,
    hastaCustom,
    setHastaCustom,
    metodoPago,
    setMetodoPago,
    vendedorId,
    setVendedorId,
    vendedores: vendedoresParaFiltro(vendedores),
    rango,
    rangoValido,
    reporte,
    cargando: sinSucursal ? false : cargando,
    error: sinSucursal
      ? "No tienes una sucursal asignada. Contacta al administrador."
      : error,
    sinSucursal,
    recargar,
  };
}
