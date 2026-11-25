import type { MetodoPago, PagoDraft } from "@/lib/supabase/types";

export const TOLERANCIA_PAGO = 0.01;

type PagoLike = {
  monto: number;
  metodo?: MetodoPago;
  metodo_pago?: MetodoPago;
};

export function redondear2(valor: number): number {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

function metodoDe(pago: PagoLike): MetodoPago {
  return pago.metodo ?? pago.metodo_pago ?? "Efectivo";
}

export function sumarPagos(pagos: PagoLike[]): number {
  return redondear2(pagos.reduce((acc, p) => acc + redondear2(p.monto), 0));
}

export function normalizarPagos(pagos: PagoLike[]): PagoDraft[] {
  return pagos
    .map((p) => ({ metodo: metodoDe(p), monto: redondear2(p.monto) }))
    .filter((p) => p.monto > 0);
}

export function validarPagos(
  pagos: PagoLike[],
  esperado: number,
): { valido: boolean; diferencia: number } {
  const normalizados = normalizarPagos(pagos);
  const suma = sumarPagos(normalizados);
  const diferencia = redondear2(esperado - suma);
  return {
    valido: normalizados.length > 0 && Math.abs(diferencia) <= TOLERANCIA_PAGO,
    diferencia,
  };
}

export function resumenMetodoPago(pagos: PagoLike[], porDefecto: MetodoPago = "Efectivo"): MetodoPago {
  const normalizados = normalizarPagos(pagos);
  if (normalizados.length === 0) return porDefecto;

  const totales = new Map<MetodoPago, number>();
  for (const pago of normalizados) {
    totales.set(pago.metodo, redondear2((totales.get(pago.metodo) ?? 0) + pago.monto));
  }

  let principal: MetodoPago = porDefecto;
  let mayor = -1;
  for (const [metodo, monto] of totales.entries()) {
    if (monto > mayor) {
      mayor = monto;
      principal = metodo;
    }
  }
  return principal;
}

export function pagosEsMixto(pagos: PagoLike[]): boolean {
  return new Set(normalizarPagos(pagos).map((p) => p.metodo)).size > 1;
}

export function resumenTextoPagos(pagos: PagoLike[], porDefecto: MetodoPago = "Efectivo"): string {
  const normalizados = normalizarPagos(pagos);
  if (normalizados.length === 0) return porDefecto;

  const metodos = [...new Set(normalizados.map((p) => p.metodo))];
  return metodos.length === 1 ? metodos[0] : metodos.join(" + ");
}

export function escalarPagos(pagos: PagoLike[], nuevoTotal: number): PagoDraft[] {
  const normalizados = normalizarPagos(pagos);
  const total = sumarPagos(normalizados);
  if (total <= 0 || nuevoTotal <= 0) return [];

  const factor = nuevoTotal / total;
  let acumulado = 0;
  return normalizados.map((pago, index) => {
    const esUltimo = index === normalizados.length - 1;
    let monto = esUltimo
      ? redondear2(nuevoTotal - acumulado)
      : redondear2(pago.monto * factor);
    if (monto < 0) monto = 0;
    acumulado = redondear2(acumulado + monto);
    return { metodo: pago.metodo, monto };
  });
}

export function repartirPagosProporcional(
  pagos: PagoLike[],
  factores: number[],
): PagoDraft[][] {
  const normalizados = normalizarPagos(pagos);
  const grupos: PagoDraft[][] = factores.map(() => []);
  if (normalizados.length === 0 || factores.length === 0) return grupos;

  const acumuladosFactores: number[] = [];
  let acumulado = 0;
  for (const factor of factores) {
    acumulado += factor;
    acumuladosFactores.push(acumulado);
  }

  for (const pago of normalizados) {
    let asignado = 0;
    for (let i = 0; i < factores.length; i++) {
      const objetivo = redondear2(pago.monto * Math.min(acumuladosFactores[i], 1));
      const monto = redondear2(objetivo - asignado);
      asignado = objetivo;
      if (monto > 0) grupos[i].push({ metodo: pago.metodo, monto });
    }
  }

  return grupos;
}
