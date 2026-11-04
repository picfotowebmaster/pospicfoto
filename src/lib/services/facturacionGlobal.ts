import type { Pedido } from "../supabase/types";
import { pedidoPagado } from "../utils/fiscal";
import { redondear2, type LineaFactura } from "./facturacion";

export interface PeriodoFacturaGlobal {
  periodo: string;
  desde: string;
  hasta: string;
  desdeISO: string;
  hastaISO: string;
  mes: number;
  anio: number;
}

export function calcularPeriodo(periodo: string): PeriodoFacturaGlobal | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(periodo);
  if (!match) return null;

  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const siguienteMes = mes === 12 ? 1 : mes + 1;
  const siguienteAnio = mes === 12 ? anio + 1 : anio;
  const mm = String(mes).padStart(2, "0");
  const smm = String(siguienteMes).padStart(2, "0");

  return {
    periodo,
    desde: `${anio}-${mm}-01`,
    hasta: `${siguienteAnio}-${smm}-01`,
    desdeISO: `${anio}-${mm}-01T00:00:00-06:00`,
    hastaISO: `${siguienteAnio}-${smm}-01T00:00:00-06:00`,
    mes,
    anio,
  };
}

export function pedidoAptoParaGlobal(pedido: Pedido): boolean {
  const rfc = (pedido.cliente_rfc ?? "").trim();
  return (
    pedido.estado !== "cancelado" &&
    !pedido.factura_uuid &&
    !pedido.factura_global_id &&
    rfc === "" &&
    pedidoPagado(pedido)
  );
}

export function totalPedido(pedido: Pedido): number {
  const detalles = pedido.detalle_pedidos ?? [];
  return redondear2(
    detalles.reduce((suma, detalle) => {
      const importe =
        detalle.importe_linea ??
        Number(detalle.cantidad ?? 0) * Number(detalle.precio_unitario ?? 0);
      return suma + Number(importe ?? 0);
    }, 0),
  );
}

export function filtrarPedidosGlobal(
  pedidos: Pedido[],
  periodo: PeriodoFacturaGlobal,
): Pedido[] {
  const desde = new Date(periodo.desdeISO).getTime();
  const hasta = new Date(periodo.hastaISO).getTime();

  return pedidos.filter((pedido) => {
    if (!pedidoAptoParaGlobal(pedido)) return false;
    if (!pedido.fecha_pago_total) return false;
    const pago = new Date(pedido.fecha_pago_total).getTime();
    return pago >= desde && pago < hasta;
  });
}

export function construirLineasGlobal(pedidos: Pedido[]): LineaFactura[] {
  const total = redondear2(
    pedidos.reduce((suma, pedido) => suma + totalPedido(pedido), 0),
  );

  if (total <= 0) return [];

  return [
    {
      producto_nombre: "Venta de productos y servicios (factura global)",
      cantidad: 1,
      precio_unitario: total,
    },
  ];
}

export function contarPedidosGlobal(pedidos: Pedido[]): number {
  return new Set(
    pedidos.map((pedido) => pedido.factura_numero || pedido.numero_pedido || pedido.id),
  ).size;
}
