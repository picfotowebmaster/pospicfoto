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
import {
  indexarSucursales,
  listarSucursales,
} from "@/lib/services/sucursales";
import {
  indexarMarcas,
  listarMarcas,
} from "@/lib/services/marcas";
import {
  anularGastoCaja,
  crearGastoCaja,
  listarGastosCaja,
  type NuevoGastoCaja,
} from "@/lib/services/gastos";
import { obtenerCobradoEfectivoCaja } from "@/lib/services/caja";
import type { GastoCaja, Marca, Sucursal } from "@/lib/supabase/types";

interface OpcionesReportesContables {
  sucursalFijo?: string | null;
  marcaFijo?: string | null;
  restringido?: boolean;
}

export function useReportesContables(
  opciones: OpcionesReportesContables = {},
) {
  const { sucursalFijo, marcaFijo, restringido = false } = opciones;
  const sinSucursal = restringido && !sucursalFijo;
  const sinMarca = restringido && !marcaFijo;
  const sinAlcance = sinSucursal || sinMarca;
  const [periodo, setPeriodoState] = useState<PeriodoKey>("mes");
  const [desdeCustom, setDesdeCustomState] = useState("");
  const [hastaCustom, setHastaCustomState] = useState("");
  const [metodoPago, setMetodoPagoState] = useState("");
  const [vendedorId, setVendedorIdState] = useState("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionadaState] = useState("");
  const [marcaSeleccionada, setMarcaSeleccionadaState] = useState("");
  const [pedidos, setPedidos] = useState<PedidoReporteContable[]>([]);
  const [gastos, setGastos] = useState<GastoCaja[]>([]);
  const [cobradoEfectivoCaja, setCobradoEfectivoCaja] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [gastosCargando, setGastosCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorGastos, setErrorGastos] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  const [gastosTrigger, setGastosTrigger] = useState(0);

  const sucursalEfectiva = restringido
    ? (sucursalFijo ?? null)
    : sucursalSeleccionada || null;
  const marcaEfectiva = restringido
    ? (marcaFijo ?? null)
    : marcaSeleccionada || null;

  useEffect(() => {
    if (sinAlcance) return;
    let ignore = false;

    listarVendedores(sucursalEfectiva ?? undefined, marcaEfectiva ?? undefined)
      .then((data) => {
        if (!ignore) setVendedores(data);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [sucursalEfectiva, marcaEfectiva, sinAlcance]);

  useEffect(() => {
    let ignore = false;

    listarMarcas()
      .then((data) => {
        if (!ignore) setMarcas(data);
      })
      .catch(() => {});

    if (!restringido) {
      listarSucursales()
        .then((data) => {
          if (!ignore) setSucursales(data);
        })
        .catch(() => {});
    }

    return () => {
      ignore = true;
    };
  }, [restringido]);

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
    if (!rangoValido || sinAlcance) return;
    let ignore = false;

    obtenerPedidosReporte(
      { desde: rango.desde, hasta: rango.hasta },
      sucursalEfectiva ?? undefined,
      marcaEfectiva ?? undefined,
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
  }, [
    rango.desde,
    rango.hasta,
    rangoValido,
    trigger,
    sucursalEfectiva,
    marcaEfectiva,
    sinAlcance,
  ]);

  useEffect(() => {
    if (!rangoValido || sinAlcance) return;
    let ignore = false;

    Promise.all([
      listarGastosCaja(
        { desde: rango.desde, hasta: rango.hasta },
        sucursalEfectiva ?? undefined,
      ),
      obtenerCobradoEfectivoCaja(
        { desde: rango.desde, hasta: rango.hasta },
        sucursalEfectiva ?? undefined,
      ),
    ])
      .then(([dataGastos, dataEfectivo]) => {
        if (ignore) return;
        setGastos(dataGastos);
        setCobradoEfectivoCaja(dataEfectivo);
        setErrorGastos(null);
        setGastosCargando(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const mensaje =
          (err instanceof Error && err.message) ||
          ((err as Record<string, unknown>)?.message as string) ||
          "Error al cargar los gastos de caja.";
        setErrorGastos(mensaje);
        setGastos([]);
        setCobradoEfectivoCaja(0);
        setGastosCargando(false);
      });

    return () => {
      ignore = true;
    };
  }, [
    rango.desde,
    rango.hasta,
    rangoValido,
    sucursalEfectiva,
    sinAlcance,
    gastosTrigger,
  ]);

  const nombresVendedores = useMemo(
    () => indexarVendedores(vendedores),
    [vendedores],
  );

  const nombresSucursales = useMemo(
    () => indexarSucursales(sucursales),
    [sucursales],
  );

  const nombresMarcas = useMemo(() => indexarMarcas(marcas), [marcas]);

  const vendedorEfectivo = restringido ? "" : vendedorId;

  const reporte = useMemo(
    () =>
      construirReporteContable(pedidos, rango, metodoPago, {
        vendedorId: vendedorEfectivo,
        nombresVendedores,
        nombresSucursales,
        nombresMarcas,
      }),
    [
      pedidos,
      rango,
      metodoPago,
      vendedorEfectivo,
      nombresVendedores,
      nombresSucursales,
      nombresMarcas,
    ],
  );

  const totalGastos = useMemo(
    () =>
      gastos
        .filter((gasto) => !gasto.anulado)
        .reduce((suma, gasto) => suma + Number(gasto.monto ?? 0), 0),
    [gastos],
  );

  const crearGasto = useCallback(async (gasto: NuevoGastoCaja) => {
    await crearGastoCaja(gasto);
    setGastosCargando(true);
    setGastosTrigger((valor) => valor + 1);
  }, []);

  const anularGasto = useCallback(async (id: string) => {
    await anularGastoCaja(id);
    setGastosCargando(true);
    setGastosTrigger((valor) => valor + 1);
  }, []);

  const setPeriodo = useCallback(
    (opcion: PeriodoKey) => {
      if (opcion === periodo) return;

      setPeriodoState(opcion);
      setError(null);
      setCargando(true);
      setGastosCargando(true);

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
      setGastosCargando(valido);
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
      setGastosCargando(valido);
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

  const setSucursalSeleccionada = useCallback(
    (valor: string) => {
      if (restringido) return;
      setSucursalSeleccionadaState(valor);
      setVendedorIdState("");
      setError(null);
      setCargando(rangoValido);
      setGastosCargando(rangoValido);
    },
    [restringido, rangoValido],
  );

  const setMarcaSeleccionada = useCallback(
    (valor: string) => {
      if (restringido) return;
      setMarcaSeleccionadaState(valor);
      setVendedorIdState("");
      setError(null);
      setCargando(rangoValido);
      setGastosCargando(rangoValido);
    },
    [restringido, rangoValido],
  );

  const recargar = useCallback(() => {
    if (!rangoValido || sinAlcance) return;
    setCargando(true);
    setGastosCargando(true);
    setError(null);
    setTrigger((valor) => valor + 1);
    setGastosTrigger((valor) => valor + 1);
  }, [rangoValido, sinAlcance]);

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
    sucursales,
    sucursalSeleccionada,
    setSucursalSeleccionada,
    sucursalEfectiva,
    marcas,
    marcaSeleccionada,
    setMarcaSeleccionada,
    marcaEfectiva,
    rango,
    rangoValido,
    reporte,
    cargando: sinAlcance ? false : cargando,
    error: sinSucursal
      ? "No tienes una sucursal asignada. Contacta al administrador."
      : sinMarca
        ? "No tienes una marca asignada. Contacta al administrador."
        : error,
    sinSucursal,
    sinMarca,
    recargar,
    gastos,
    totalGastos,
    cobradoEfectivoCaja,
    gastosCargando: sinAlcance ? false : gastosCargando,
    errorGastos,
    crearGasto,
    anularGasto,
  };
}
