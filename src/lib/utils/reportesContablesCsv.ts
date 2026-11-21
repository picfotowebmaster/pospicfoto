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
  sucursal?: string;
  marca?: string;
  generadoEn?: string;
  generadoPor?: string;
}

function filasMeta(meta: MetaReporteContable): CeldaCSV[][] {
  return [
    ["Reporte contable de corte"],
    ["Sucursal", meta.sucursal || "Todas"],
    ["Marca", meta.marca || "Todas"],
    ["Periodo", `${meta.desde} a ${meta.hasta}`],
    ["Método de pago", meta.metodoPago || "Todos"],
    ["Vendedor", meta.vendedor || "Todos"],
    ["Generado", meta.generadoEn || ""],
    ["Generado por", meta.generadoPor || ""],
    [],
  ];
}

function dinero(valor: number): string {
  return Number(valor).toFixed(2);
}

function filaTotales(columnas: number, indiceImporte: number, total: number): CeldaCSV[] {
  const fila: CeldaCSV[] = Array(columnas).fill("");
  fila[0] = "Totales";
  fila[indiceImporte] = dinero(total);
  return fila;
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

  const totalPedidosVendedor = reporte.porVendedor.reduce(
    (suma, vendedor) => suma + vendedor.pedidos,
    0,
  );
  const totalVendidoVendedor = reporte.porVendedor.reduce(
    (suma, vendedor) => suma + vendedor.vendido,
    0,
  );
  const totalCobradoVendedor = reporte.porVendedor.reduce(
    (suma, vendedor) => suma + vendedor.cobrado,
    0,
  );

  const totalMovimientosCobrador = reporte.porCobrador.reduce(
    (suma, cobrador) => suma + cobrador.movimientos,
    0,
  );
  const totalCobradoCobrador = reporte.porCobrador.reduce(
    (suma, cobrador) => suma + cobrador.cobrado,
    0,
  );

  const totalMovimientosMetodo = reporte.cobradoPorMetodo.reduce(
    (suma, metodo) => suma + metodo.count,
    0,
  );
  const totalCobradoMetodo = reporte.cobradoPorMetodo.reduce(
    (suma, metodo) => suma + metodo.total,
    0,
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
    ["Cobrado bruto", dinero(reporte.totalCobrado + reporte.totalReembolsado)],
    ["Reembolsos realizados", dinero(reporte.totalReembolsado)],
    ["Cobrado neto", dinero(reporte.totalCobrado)],
    [],
    ["Resumen por vendedor"],
    ["Vendedor", "Pedidos", "Vendido", "Cobrado"],
    ...reporte.porVendedor.map((vendedor) => [
      vendedor.vendedorNombre,
      vendedor.pedidos,
      dinero(vendedor.vendido),
      dinero(vendedor.cobrado),
    ]),
    [
      "Totales",
      totalPedidosVendedor,
      dinero(totalVendidoVendedor),
      dinero(totalCobradoVendedor),
    ],
    [],
    ["Cobrado por cobrador"],
    ["Cobrador", "Movimientos", "Cobrado"],
    ...reporte.porCobrador.map((cobrador) => [
      cobrador.cobradorNombre,
      cobrador.movimientos,
      dinero(cobrador.cobrado),
    ]),
    [
      "Totales",
      totalMovimientosCobrador,
      dinero(totalCobradoCobrador),
    ],
    [],
    ["Cobrado por método"],
    ["Método", "Movimientos", "Cobrado"],
    ...reporte.cobradoPorMetodo.map((metodo) => [
      metodo.metodo_pago,
      metodo.count,
      dinero(metodo.total),
    ]),
    [
      "Totales",
      totalMovimientosMetodo,
      dinero(totalCobradoMetodo),
    ],
  ];
}

export function filasMovimientosContables(
  movimientos: MovimientoContable[],
  meta: MetaReporteContable,
): CeldaCSV[][] {
  const encabezado: CeldaCSV[] = [
    "Pedido",
    "Sucursal",
    "Marca",
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
    movimiento.sucursalNombre,
    movimiento.marcaNombre,
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

  return [
    ...filasMeta(meta),
    encabezado,
    ...filas,
    filaTotales(encabezado.length, 11, totalImporte),
  ];
}
