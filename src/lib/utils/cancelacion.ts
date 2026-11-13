export const MOTIVOS_CANCELACION_PEDIDO = [
  { value: "cliente_cancela", label: "Cliente canceló" },
  { value: "error_captura", label: "Error de captura" },
  { value: "duplicado", label: "Pedido duplicado" },
  { value: "falta_pago", label: "Falta de pago" },
  { value: "otro", label: "Otro" },
] as const;

export type MotivoCancelacionPedido =
  (typeof MOTIVOS_CANCELACION_PEDIDO)[number]["value"];

export function etiquetaMotivoCancelacion(
  motivo: string | null | undefined,
): string {
  if (!motivo) return "Sin motivo";
  return (
    MOTIVOS_CANCELACION_PEDIDO.find((item) => item.value === motivo)?.label ??
    motivo
  );
}

export interface PedidoCancelable {
  estado: string;
  area_actual: string | null;
  factura_uuid?: string | null;
  factura_estado?: string | null;
  factura_global_id?: string | null;
  sucursal_id?: string | null;
}

export interface PerfilCancelacion {
  rol: string | null | undefined;
  sucursal_id?: string | null;
}

export interface ResultadoCancelacion {
  permitido: boolean;
  razon?: string;
}

export function tieneCfdiVigente(
  pedido: Pick<
    PedidoCancelable,
    "factura_uuid" | "factura_estado" | "factura_global_id"
  >,
): boolean {
  const facturaVigente =
    Boolean(pedido.factura_uuid) && pedido.factura_estado !== "cancelada";
  return facturaVigente || Boolean(pedido.factura_global_id);
}

export function montoPagadoPedido(pedido: {
  anticipo: number;
  total: number;
  saldo_cobrado?: boolean | null;
}): number {
  const anticipo = Math.max(0, pedido.anticipo ?? 0);
  const saldo = pedido.saldo_cobrado
    ? Math.max(0, (pedido.total ?? 0) - anticipo)
    : 0;
  return Math.round((anticipo + saldo) * 100) / 100;
}

export function puedeCancelarPedido(
  pedido: PedidoCancelable,
  perfil: PerfilCancelacion,
): ResultadoCancelacion {
  const rol = perfil.rol;

  if (rol !== "mostrador" && rol !== "admin" && rol !== "superadmin") {
    return {
      permitido: false,
      razon: "Tu rol no tiene permiso para cancelar ventas.",
    };
  }

  if (pedido.estado === "cancelado") {
    return { permitido: false, razon: "La venta ya está cancelada." };
  }

  if (tieneCfdiVigente(pedido)) {
    return {
      permitido: false,
      razon: "La venta tiene CFDI vigente. Cancela la factura en Contabilidad primero.",
    };
  }

  if (rol === "mostrador") {
    if (pedido.estado !== "pendiente" || pedido.area_actual !== "mostrador") {
      return {
        permitido: false,
        razon: "Solo puedes cancelar pedidos pendientes que aún están en mostrador.",
      };
    }

    if (
      !perfil.sucursal_id ||
      !pedido.sucursal_id ||
      perfil.sucursal_id !== pedido.sucursal_id
    ) {
      return {
        permitido: false,
        razon: "Solo puedes cancelar ventas de tu sucursal.",
      };
    }
  }

  if (rol === "admin" && pedido.estado === "entregado") {
    return {
      permitido: false,
      razon: "Solo un superadmin puede cancelar pedidos entregados.",
    };
  }

  return { permitido: true };
}
