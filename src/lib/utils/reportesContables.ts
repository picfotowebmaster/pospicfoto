import { fechaNegocio } from "./fechas";

export interface RangoReporte {
  desde: string;
  hasta: string;
}

export interface PedidoReporteContable {
  id: string;
  numero_pedido?: string | null;
  cliente_nombre: string;
  cliente_rfc?: string | null;
  cajero_id?: string | null;
  fecha_recepcion: string;
  estado?: string | null;
  subtotal?: number | null;
  anticipo?: number | null;
  total?: number | null;
  metodo_pago?: string | null;
  saldo_cobrado?: boolean | null;
  saldo_metodo_pago?: string | null;
  saldo_cobrado_en?: string | null;
  saldo_cobrado_por?: string | null;
  factura_folio?: string | null;
  factura_uuid?: string | null;
  factura_estado?: string | null;
  factura_fecha?: string | null;
}

export interface MovimientoContable {
  pedidoId: string;
  numeroPedido: string | null;
  clienteNombre: string;
  clienteRfc: string | null;
  vendedorId: string | null;
  vendedorNombre: string;
  cobradoPorId: string | null;
  cobradoPorNombre: string;
  fechaVenta: string;
  fechaCobro: string;
  tipo: "Anticipo" | "Saldo";
  metodoPago: string;
  importe: number;
  subtotal: number;
  iva: number;
  total: number;
  estado: string;
  facturaFolio: string | null;
  facturaUuid: string | null;
  facturaEstado: string | null;
}

export interface ResumenVendedor {
  vendedorId: string | null;
  vendedorNombre: string;
  pedidos: number;
  vendido: number;
  cobrado: number;
}

export interface OpcionesReporteContable {
  vendedorId?: string;
  nombresVendedores?: Map<string, string>;
}

export interface MovimientoDiaReporte {
  fecha: string;
  pedidos: number;
  vendido: number;
  cobrado: number;
  saldoPendiente: number;
}

export interface ReporteContable {
  totalVendido: number;
  totalCobrado: number;
  saldoPendiente: number;
  totalPedidos: number;
  ticketPromedio: number;
  porDia: MovimientoDiaReporte[];
  movimientos: MovimientoContable[];
  porVendedor: ResumenVendedor[];
  cobradoPorMetodo: { metodo_pago: string; count: number; total: number }[];
}

const TASA_IVA = 0.16;

function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function fechaDia(fecha: string | null | undefined): string {
  if (!fecha) return "";
  return fechaNegocio(fecha);
}

function dentroDeRango(fecha: string | null | undefined, rango: RangoReporte): boolean {
  const dia = fechaDia(fecha);
  return dia !== "" && dia >= rango.desde && dia <= rango.hasta;
}

function desglosarIva(total: number): { subtotal: number; iva: number } {
  const subtotal = redondear2(total / (1 + TASA_IVA));
  return { subtotal, iva: redondear2(total - subtotal) };
}

function coincideMetodo(
  pedido: PedidoReporteContable,
  metodoPago: string,
): boolean {
  if (!metodoPago) return true;

  const anticipo = Number(pedido.anticipo ?? 0);
  const metodoAnticipo = pedido.metodo_pago ?? "Efectivo";
  if (anticipo > 0.01 && metodoAnticipo === metodoPago) return true;

  if (pedido.saldo_cobrado) {
    const metodoSaldo =
      pedido.saldo_metodo_pago ?? pedido.metodo_pago ?? "Efectivo";
    if (metodoSaldo === metodoPago) return true;
  }

  return false;
}

function saldoPendientePedido(pedido: PedidoReporteContable): number {
  if (pedido.estado === "cancelado" || pedido.saldo_cobrado) return 0;
  const total = Number(pedido.total ?? 0);
  const anticipo = Number(pedido.anticipo ?? 0);
  return Math.max(0, redondear2(total - anticipo));
}

function nombreDe(
  id: string | null | undefined,
  nombres: Map<string, string>,
  fallback: string,
): string {
  if (!id) return fallback;
  return nombres.get(id) ?? fallback;
}

export function construirReporteContable(
  pedidos: PedidoReporteContable[],
  rango: RangoReporte,
  metodoPago = "",
  opciones: OpcionesReporteContable = {},
): ReporteContable {
  const vendedorFiltro = opciones.vendedorId ?? "";
  const nombres = opciones.nombresVendedores ?? new Map<string, string>();
  const dias = new Map<string, MovimientoDiaReporte>();
  const metodos = new Map<string, { count: number; total: number }>();
  const vendedores = new Map<string, ResumenVendedor>();
  const movimientos: MovimientoContable[] = [];

  let totalVendido = 0;
  let totalCobrado = 0;
  let totalSaldoPendiente = 0;
  let totalPedidos = 0;

  function coincideVendedor(pedido: PedidoReporteContable): boolean {
    if (!vendedorFiltro) return true;
    if (vendedorFiltro === "sin_vendedor") return !pedido.cajero_id;
    return pedido.cajero_id === vendedorFiltro;
  }

  function entradaVendedor(id: string | null): ResumenVendedor {
    const clave = id ?? "sin_vendedor";
    const actual = vendedores.get(clave) ?? {
      vendedorId: id,
      vendedorNombre: nombreDe(id, nombres, "Sin vendedor"),
      pedidos: 0,
      vendido: 0,
      cobrado: 0,
    };
    vendedores.set(clave, actual);
    return actual;
  }

  function dia(fecha: string): MovimientoDiaReporte {
    const actual = dias.get(fecha) ?? {
      fecha,
      pedidos: 0,
      vendido: 0,
      cobrado: 0,
      saldoPendiente: 0,
    };
    dias.set(fecha, actual);
    return actual;
  }

  function sumarCobro(
    pedido: PedidoReporteContable,
    tipo: "Anticipo" | "Saldo",
    fechaCobro: string,
    metodo: string,
    importe: number,
    total: number,
    desglose: { subtotal: number; iva: number },
  ) {
    const redondeado = redondear2(importe);
    totalCobrado = redondear2(totalCobrado + redondeado);

    const diaActual = dia(fechaCobro);
    diaActual.cobrado = redondear2(diaActual.cobrado + redondeado);

    const metodoActual = metodos.get(metodo) ?? { count: 0, total: 0 };
    metodoActual.count += 1;
    metodoActual.total = redondear2(metodoActual.total + redondeado);
    metodos.set(metodo, metodoActual);

    const vendedorId = pedido.cajero_id ?? null;
    const vendedorNombre = nombreDe(vendedorId, nombres, "Sin vendedor");
    const cobradoPorId =
      tipo === "Anticipo"
        ? vendedorId
        : (pedido.saldo_cobrado_por ?? null);
    const cobradoPorNombre =
      tipo === "Anticipo"
        ? vendedorNombre
        : nombreDe(cobradoPorId, nombres, "Sin registro");

    const resumenVendedor = entradaVendedor(vendedorId);
    resumenVendedor.cobrado = redondear2(
      resumenVendedor.cobrado + redondeado,
    );

    movimientos.push({
      pedidoId: pedido.id,
      numeroPedido: pedido.numero_pedido ?? null,
      clienteNombre: pedido.cliente_nombre,
      clienteRfc: pedido.cliente_rfc ?? null,
      vendedorId,
      vendedorNombre,
      cobradoPorId,
      cobradoPorNombre,
      fechaVenta: pedido.fecha_recepcion,
      fechaCobro,
      tipo,
      metodoPago: metodo,
      importe: redondeado,
      subtotal: desglose.subtotal,
      iva: desglose.iva,
      total,
      estado: pedido.estado ?? "pendiente",
      facturaFolio: pedido.factura_folio ?? null,
      facturaUuid: pedido.factura_uuid ?? null,
      facturaEstado: pedido.factura_estado ?? null,
    });
  }

  for (const pedido of pedidos) {
    if (pedido.estado === "cancelado") continue;

    const total = redondear2(Number(pedido.total ?? 0));
    const anticipo = redondear2(Number(pedido.anticipo ?? 0));
    const saldo = Math.max(0, redondear2(total - anticipo));
    const desglose = desglosarIva(total);
    const vendidoEnRango = dentroDeRango(pedido.fecha_recepcion, rango);
    const coincide = coincideMetodo(pedido, metodoPago);
    const coincideV = coincideVendedor(pedido);

    if (vendidoEnRango && coincide && coincideV) {
      totalVendido = redondear2(totalVendido + total);
      totalPedidos += 1;
      const resumenVendedor = entradaVendedor(pedido.cajero_id ?? null);
      resumenVendedor.pedidos += 1;
      resumenVendedor.vendido = redondear2(
        resumenVendedor.vendido + total,
      );
      const diaVenta = fechaDia(pedido.fecha_recepcion);
      const diaActual = dia(diaVenta);
      diaActual.pedidos += 1;
      diaActual.vendido = redondear2(diaActual.vendido + total);

      const pendiente = saldoPendientePedido(pedido);
      if (pendiente > 0.01) {
        totalSaldoPendiente = redondear2(totalSaldoPendiente + pendiente);
        diaActual.saldoPendiente = redondear2(
          diaActual.saldoPendiente + pendiente,
        );
      }
    }

    const metodoAnticipo = pedido.metodo_pago ?? "Efectivo";
    if (
      anticipo > 0.01 &&
      vendidoEnRango &&
      coincideV &&
      (!metodoPago || metodoAnticipo === metodoPago)
    ) {
      sumarCobro(
        pedido,
        "Anticipo",
        fechaDia(pedido.fecha_recepcion),
        metodoAnticipo,
        anticipo,
        total,
        desglose,
      );
    }

    if (saldo > 0.01 && pedido.saldo_cobrado) {
      const fechaSaldo =
        fechaDia(pedido.saldo_cobrado_en) || fechaDia(pedido.fecha_recepcion);
      const metodoSaldo =
        pedido.saldo_metodo_pago ?? pedido.metodo_pago ?? "Efectivo";

      if (
        dentroDeRango(fechaSaldo, rango) &&
        coincideV &&
        (!metodoPago || metodoSaldo === metodoPago)
      ) {
        sumarCobro(
          pedido,
          "Saldo",
          fechaSaldo,
          metodoSaldo,
          saldo,
          total,
          desglose,
        );
      }
    }
  }

  movimientos.sort((a, b) => {
    const fecha = a.fechaCobro.localeCompare(b.fechaCobro);
    if (fecha !== 0) return fecha;
    return String(a.numeroPedido ?? "").localeCompare(
      String(b.numeroPedido ?? ""),
    );
  });

  return {
    totalVendido,
    totalCobrado,
    saldoPendiente: totalSaldoPendiente,
    totalPedidos,
    ticketPromedio:
      totalPedidos > 0 ? redondear2(totalVendido / totalPedidos) : 0,
    porDia: [...dias.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    movimientos,
    porVendedor: [...vendedores.values()].sort((a, b) => {
      if (b.vendido !== a.vendido) return b.vendido - a.vendido;
      return a.vendedorNombre.localeCompare(b.vendedorNombre);
    }),
    cobradoPorMetodo: [...metodos.entries()]
      .map(([metodo_pago, datos]) => ({ metodo_pago, ...datos }))
      .sort((a, b) => b.total - a.total),
  };
}
