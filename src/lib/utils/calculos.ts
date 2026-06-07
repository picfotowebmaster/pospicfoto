export function sumarLineas(
  lineas: { cantidad: number; precio_unitario: number }[],
): number {
  return lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0);
}

export function calcularAnticipo(subtotal: number, porcentaje: number): number {
  return Math.round(subtotal * (porcentaje / 100) * 100) / 100;
}

export function generarIdLocal(): string {
  return crypto.randomUUID();
}
