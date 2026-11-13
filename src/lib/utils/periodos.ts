import { hoyNegocio } from "./fechas";

export type PeriodoKey = "hoy" | "semana" | "mes" | "anio" | "personalizado";

export interface RangoPeriodo {
  desde: string;
  hasta: string;
}

function formatearFecha(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function calcularRangoPeriodo(
  periodo: PeriodoKey,
  opciones: { hoy?: Date; desde?: string; hasta?: string } = {},
): RangoPeriodo {
  const hoy = opciones.hoy ?? hoyNegocio();

  if (periodo === "personalizado") {
    const desde = opciones.desde || formatearFecha(hoy);
    const hasta = opciones.hasta || desde;
    return { desde, hasta };
  }

  if (periodo === "hoy") {
    const fecha = formatearFecha(hoy);
    return { desde: fecha, hasta: fecha };
  }

  if (periodo === "semana") {
    const dia = hoy.getDay();
    const desplazamientoLunes = dia === 0 ? 6 : dia - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - desplazamientoLunes);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return { desde: formatearFecha(lunes), hasta: formatearFecha(domingo) };
  }

  if (periodo === "mes") {
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return { desde: formatearFecha(primero), hasta: formatearFecha(ultimo) };
  }

  const primero = new Date(hoy.getFullYear(), 0, 1);
  const ultimo = new Date(hoy.getFullYear(), 11, 31);
  return { desde: formatearFecha(primero), hasta: formatearFecha(ultimo) };
}

export const ETIQUETAS_PERIODO: Record<PeriodoKey, string> = {
  hoy: "Hoy",
  semana: "Esta semana",
  mes: "Este mes",
  anio: "Este año",
  personalizado: "Personalizado",
};
