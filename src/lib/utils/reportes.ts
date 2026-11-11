export interface PedidoReporte {
  fecha_recepcion: string;
  total: number | null;
  anticipo: number | null;
  metodo_pago: string | null;
  saldo_cobrado?: boolean | null;
  saldo_metodo_pago?: string | null;
  saldo_cobrado_en?: string | null;
  estado?: string | null;
}

export interface MovimientoDia {
  fecha_recepcion: string;
  count: number;
  total: number;
}

export interface MovimientoMetodo {
  metodo_pago: string;
  count: number;
  total: number;
}

export interface ResumenReporte {
  ventasPorDia: MovimientoDia[];
  cobradoPorDia: MovimientoDia[];
  cobradoPorMetodo: MovimientoMetodo[];
  totalVendido: number;
  totalCobrado: number;
  saldoPendiente: number;
}

function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function fechaDePago(fecha: string | null | undefined): string {
  return (fecha ?? "").slice(0, 10);
}

export function construirResumenReporte(
  pedidos: PedidoReporte[],
  desde: string,
): ResumenReporte {
  const ventas = new Map<string, MovimientoDia>();
  const cobros = new Map<string, MovimientoDia>();
  const metodos = new Map<string, MovimientoMetodo>();

  let totalVendido = 0;
  let totalCobrado = 0;
  let saldoPendiente = 0;

  function sumarDia(
    mapa: Map<string, MovimientoDia>,
    fecha: string,
    monto: number,
  ) {
    if (!fecha) return;
    const actual = mapa.get(fecha) ?? {
      fecha_recepcion: fecha,
      count: 0,
      total: 0,
    };
    actual.count += 1;
    actual.total = redondear2(actual.total + monto);
    mapa.set(fecha, actual);
  }

  function sumarMetodo(metodo: string, monto: number) {
    const clave = metodo || "Efectivo";
    const actual = metodos.get(clave) ?? {
      metodo_pago: clave,
      count: 0,
      total: 0,
    };
    actual.count += 1;
    actual.total = redondear2(actual.total + monto);
    metodos.set(clave, actual);
  }

  for (const pedido of pedidos) {
    if (pedido.estado === "cancelado") continue;

    const total = Number(pedido.total ?? 0);
    const anticipo = Number(pedido.anticipo ?? 0);
    const saldo = Math.max(0, redondear2(total - anticipo));
    const fechaRecepcion = pedido.fecha_recepcion;

    if (fechaRecepcion >= desde) {
      totalVendido = redondear2(totalVendido + total);
      const venta = ventas.get(fechaRecepcion) ?? {
        fecha_recepcion: fechaRecepcion,
        count: 0,
        total: 0,
      };
      venta.count += 1;
      venta.total = redondear2(venta.total + total);
      ventas.set(fechaRecepcion, venta);

      if (!pedido.saldo_cobrado && saldo > 0.01) {
        saldoPendiente = redondear2(saldoPendiente + saldo);
      }

      if (anticipo > 0.01) {
        totalCobrado = redondear2(totalCobrado + anticipo);
        sumarDia(cobros, fechaRecepcion, anticipo);
        sumarMetodo(pedido.metodo_pago ?? "Efectivo", anticipo);
      }
    }

    if (pedido.saldo_cobrado && saldo > 0.01) {
      const fechaSaldo = fechaDePago(pedido.saldo_cobrado_en) || fechaRecepcion;
      if (fechaSaldo >= desde) {
        totalCobrado = redondear2(totalCobrado + saldo);
        sumarDia(cobros, fechaSaldo, saldo);
        sumarMetodo(
          pedido.saldo_metodo_pago ?? pedido.metodo_pago ?? "Efectivo",
          saldo,
        );
      }
    }
  }

  const ordenar = <T extends { fecha_recepcion: string }>(items: T[]) =>
    items.sort((a, b) => a.fecha_recepcion.localeCompare(b.fecha_recepcion));

  return {
    ventasPorDia: ordenar([...ventas.values()]),
    cobradoPorDia: ordenar([...cobros.values()]),
    cobradoPorMetodo: [...metodos.values()].sort(
      (a, b) => b.total - a.total,
    ),
    totalVendido,
    totalCobrado,
    saldoPendiente,
  };
}
