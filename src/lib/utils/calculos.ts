export function sumarLineas(
  lineas: { cantidad: number; precio_unitario: number }[],
): number {
  return lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0);
}

export function calcularAnticipo(subtotal: number, porcentaje: number): number {
  return Math.round(subtotal * (porcentaje / 100) * 100) / 100;
}

export function normalizarAnticipoManual(monto: number, subtotal: number): number {
  const valor = Number(monto);
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  const tope = Math.max(0, subtotal);
  return Math.round(Math.min(valor, tope) * 100) / 100;
}

export function generarIdLocal(): string {
  return crypto.randomUUID();
}
