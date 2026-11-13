export const ZONA_NEGOCIO = "America/Mexico_City";

const FORMATO_FECHA = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_NEGOCIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const FORMATO_HORA = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_NEGOCIO,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const FECHA_SOLA = /^\d{4}-\d{2}-\d{2}$/;
const HORA_SOLA = /^\d{2}:\d{2}(:\d{2})?$/;

function partesFecha(fecha: Date) {
  const partes = FORMATO_FECHA.formatToParts(fecha);
  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return {
    anio: valor("year"),
    mes: valor("month"),
    dia: valor("day"),
  };
}

export function fechaNegocio(valor: string | Date = new Date()): string {
  if (typeof valor === "string") {
    if (FECHA_SOLA.test(valor)) return valor;
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor.slice(0, 10);
    const { anio, mes, dia } = partesFecha(fecha);
    return `${anio}-${mes}-${dia}`;
  }

  if (Number.isNaN(valor.getTime())) return "";
  const { anio, mes, dia } = partesFecha(valor);
  return `${anio}-${mes}-${dia}`;
}

export function horaNegocio(valor: string | Date = new Date()): string {
  if (typeof valor === "string" && HORA_SOLA.test(valor)) {
    return valor.length === 5 ? `${valor}:00` : valor;
  }

  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";

  const partes = FORMATO_HORA.formatToParts(fecha);
  const obtener = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "00";
  return `${obtener("hour")}:${obtener("minute")}:${obtener("second")}`;
}

export function hoyNegocio(): Date {
  const [anio, mes, dia] = fechaNegocio().split("-").map(Number);
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
}
