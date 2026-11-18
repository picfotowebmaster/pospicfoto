export interface PerfilVendedor {
  id: string;
  nombre: string | null;
}

interface PedidoConVendedor {
  cajero_id: string | null;
}

export type PedidoConVendedorResuelto<T> = T & {
  vendedor_nombre: string | null;
};

export function idsVendedoresUnicos(
  pedidos: { cajero_id: string | null }[],
): string[] {
  return Array.from(
    new Set(
      pedidos
        .map((pedido) => pedido.cajero_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

export function construirMapaNombres(
  perfiles: PerfilVendedor[],
): Map<string, string | null> {
  return new Map(
    perfiles.map((perfil) => [perfil.id, perfil.nombre?.trim() || null]),
  );
}

export function aplicarNombresVendedor<T extends PedidoConVendedor>(
  pedidos: T[],
  nombres: Map<string, string | null>,
): PedidoConVendedorResuelto<T>[] {
  return pedidos.map((pedido) => ({
    ...pedido,
    vendedor_nombre: pedido.cajero_id
      ? nombres.get(pedido.cajero_id) ?? null
      : null,
  }));
}

export async function resolverNombresVendedor<T extends PedidoConVendedor>(
  pedidos: T[],
  consultar: (ids: string[]) => Promise<PerfilVendedor[]>,
): Promise<PedidoConVendedorResuelto<T>[]> {
  const ids = idsVendedoresUnicos(pedidos);
  if (ids.length === 0) {
    return pedidos.map((pedido) => ({ ...pedido, vendedor_nombre: null }));
  }

  const perfiles = await consultar(ids);
  return aplicarNombresVendedor(pedidos, construirMapaNombres(perfiles));
}
