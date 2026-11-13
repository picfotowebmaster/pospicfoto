import type { CeldaCSV } from "./csv";
import type {
  MovimientoContable,
  MovimientoDiaReporte,
  ReporteContable,
} from "./reportesContables";

export interface MetaReporteContable {
  desde: string;
  hasta: string;
  metodoPago: string;
  vendedor?: string;
}

function filasMeta(meta: MetaReporteContable): CeldaCSV[][] {
  return [
    ["Reporte contable"],
    ["Periodo", `${meta.desde} a ${meta.hasta}`],
    ["Método de pago", meta.metodoPago || "Todos"],
    ["Vendedor", meta.vendedor || "Todos"],
    [],
  ];
}

function dinero(valor: number): string {
  return Number(valor).toFixed(2);
}

export function filasResumenContable(
  reporte: ReporteContable,
  meta: MetaReporteContable,
): CeldaCSV[][] {
  const encabezado: CeldaCSV[] = [
    "Fecha",
    "Pedidos",
    "Vendido",
    "Cobrado",
    "Saldo pendiente",
  ];

  const detalle: CeldaCSV[][] = reporte.porDia.map(
    (dia: MovimientoDiaReporte) => [
      dia.fecha,
      dia.pedidos,
      dinero(dia.vendido),
      dinero(dia.cobrado),
      dinero(dia.saldoPendiente),
    ],
  );

  return [
    ...filasMeta(meta),
    encabezado,
    ...detalle,
    [
      "Totales",
      reporte.totalPedidos,
      dinero(reporte.totalVendido),
      dinero(reporte.totalCobrado),
      dinero(reporte.saldoPendiente),
    ],
    [],
    ["Resumen por vendedor"],
    ["Vendedor", "Pedidos", "Vendido", "Cobrado"],
    ...reporte.porVendedor.map((vendedor) => [
      vendedor.vendedorNombre,
      vendedor.pedidos,
      dinero(vendedor.vendido),
      dinero(vendedor.cobrado),
    ]),
  ];
}

export function filasMovimientosContables(
  movimientos: MovimientoContable[],
  meta: MetaReporteContable,
): CeldaCSV[][] {
  const encabezado: CeldaCSV[] = [
    "Pedido",
    "Cliente",
    "RFC",
    "Vendedor",
    "Cobrado por",
    "Fecha venta",
    "Fecha cobro",
    "Tipo",
    "Método",
    "Importe cobrado",
    "Subtotal pedido",
    "IVA pedido",
    "Total pedido",
    "Estado",
    "Factura folio",
    "Factura UUID",
    "Estado factura",
  ];

  const filas: CeldaCSV[][] = movimientos.map((movimiento) => [
    movimiento.numeroPedido ?? movimiento.pedidoId,
    movimiento.clienteNombre,
    movimiento.clienteRfc ?? "",
    movimiento.vendedorNombre,
    movimiento.cobradoPorNombre,
    movimiento.fechaVenta,
    movimiento.fechaCobro,
    movimiento.tipo,
    movimiento.metodoPago,
    dinero(movimiento.importe),
    dinero(movimiento.subtotal),
    dinero(movimiento.iva),
    dinero(movimiento.total),
    movimiento.estado,
    movimiento.facturaFolio ?? "",
    movimiento.facturaUuid ?? "",
    movimiento.facturaEstado ?? "",
  ]);

  const totalImporte = movimientos.reduce(
    (suma, movimiento) => suma + Number(movimiento.importe ?? 0),
    0,
  );

  const filaTotales: CeldaCSV[] = Array(encabezado.length).fill("");
  filaTotales[0] = "Totales";
  filaTotales[9] = dinero(totalImporte);

  return [
    ...filasMeta(meta),
    encabezado,
    ...filas,
    filaTotales,
  ];
}
