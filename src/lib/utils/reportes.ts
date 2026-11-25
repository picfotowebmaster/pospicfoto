import { fechaNegocio } from "./fechas";

export interface PagoReporteResumen {
  tipo: "anticipo" | "saldo";
  metodo_pago: string;
  monto: number;
  cobrado_en?: string | null;
}

export interface PedidoReporte {
  fecha_recepcion: string;
  total: number | null;
  anticipo: number | null;
  metodo_pago: string | null;
  saldo_cobrado?: boolean | null;
  saldo_metodo_pago?: string | null;
  saldo_cobrado_en?: string | null;
  estado?: string | null;
  pagos_pedido?: PagoReporteResumen[] | null;
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
  if (!fecha) return "";
  return fechaNegocio(fecha);
}

function pagosCobrados(
  pedido: PedidoReporte,
): { metodo: string; monto: number; fecha: string }[] {
  const resultado: { metodo: string; monto: number; fecha: string }[] = [];
  const registrados = pedido.pagos_pedido ?? [];
  const anticipos = registrados.filter(
    (p) => p.tipo === "anticipo" && redondear2(p.monto) > 0.01,
  );
  const saldos = registrados.filter(
    (p) => p.tipo === "saldo" && redondear2(p.monto) > 0.01,
  );

  const anticipo = redondear2(Number(pedido.anticipo ?? 0));
  if (anticipos.length > 0) {
    for (const pago of anticipos) {
      resultado.push({
        metodo: pago.metodo_pago || pedido.metodo_pago || "Efectivo",
        monto: redondear2(pago.monto),
        fecha: pedido.fecha_recepcion || fechaDePago(pago.cobrado_en),
      });
    }
  } else if (anticipo > 0.01) {
    resultado.push({
      metodo: pedido.metodo_pago ?? "Efectivo",
      monto: anticipo,
      fecha: pedido.fecha_recepcion,
    });
  }

  const total = Number(pedido.total ?? 0);
  const saldo = Math.max(0, redondear2(total - anticipo));
  if (saldos.length > 0) {
    for (const pago of saldos) {
      resultado.push({
        metodo:
          pago.metodo_pago ||
          pedido.saldo_metodo_pago ||
          pedido.metodo_pago ||
          "Efectivo",
        monto: redondear2(pago.monto),
        fecha:
          fechaDePago(pago.cobrado_en) ||
          fechaDePago(pedido.saldo_cobrado_en) ||
          pedido.fecha_recepcion,
      });
    }
  } else if (pedido.saldo_cobrado && saldo > 0.01) {
    resultado.push({
      metodo:
        pedido.saldo_metodo_pago ?? pedido.metodo_pago ?? "Efectivo",
      monto: saldo,
      fecha:
        fechaDePago(pedido.saldo_cobrado_en) || pedido.fecha_recepcion,
    });
  }

  return resultado;
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
    }

    for (const pago of pagosCobrados(pedido)) {
      if (pago.fecha >= desde) {
        totalCobrado = redondear2(totalCobrado + pago.monto);
        sumarDia(cobros, pago.fecha, pago.monto);
        sumarMetodo(pago.metodo, pago.monto);
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
