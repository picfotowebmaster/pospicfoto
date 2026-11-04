export function normalizarRfc(valor: string): string {
  return valor.toUpperCase().replace(/[^A-ZÑ&0-9]/g, "");
}

export function rfcValido(rfc: string): boolean {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(normalizarRfc(rfc));
}

export function cpValido(cp: string): boolean {
  return /^\d{5}$/.test(cp.trim());
}

export function pedidoPagado(pedido: {
  total: number;
  anticipo: number;
  saldo_cobrado?: boolean | null;
}): boolean {
  const total = Number(pedido.total ?? 0);
  const anticipo = Number(pedido.anticipo ?? 0);
  return Boolean(pedido.saldo_cobrado) || total - anticipo <= 0.01;
}

