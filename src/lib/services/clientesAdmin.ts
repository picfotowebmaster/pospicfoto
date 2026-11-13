import { supabase } from "../supabase/client";
import type {
  Cliente,
  DetallePedido,
  EstadoPedido,
  MetodoPago,
} from "../supabase/types";
import type { CeldaCSV } from "../utils/csv";

export interface FiltrosClientesAdmin {
  busqueda: string;
  pagina: number;
  porPagina: number;
}

export interface ResultadoClientesAdmin {
  clientes: Cliente[];
  total: number;
}

export interface DatosEdicionCliente {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  notas: string;
  rfc: string;
}

export interface CompraCliente {
  id: string;
  numero_pedido: string | null;
  cliente_nombre: string;
  fecha_recepcion: string;
  hora_recepcion: string;
  fecha_entrega: string;
  hora_entrega: string;
  estado: EstadoPedido;
  metodo_pago: MetodoPago;
  subtotal: number;
  anticipo: number;
  total: number;
  saldo_cobrado: boolean | null;
  saldo_metodo_pago: MetodoPago | null;
  saldo_cobrado_en: string | null;
  detalle_pedidos?: DetallePedido[];
}

export interface ResumenCompras {
  totalCompras: number;
  totalGastado: number;
  ticketPromedio: number;
  ultimaCompra: string | null;
}

type FilaClienteAdmin = Cliente & { total?: number | string | null };

function filaACliente(fila: FilaClienteAdmin): Cliente {
  return {
    id: fila.id,
    nombre: fila.nombre,
    telefono: fila.telefono ?? null,
    email: fila.email ?? null,
    notas: fila.notas ?? null,
    rfc: fila.rfc ?? null,
    last_order_at: fila.last_order_at ?? null,
    pedidos_count: Number(fila.pedidos_count ?? 0),
    total_gastado: Number(fila.total_gastado ?? 0),
    created_at: fila.created_at,
    updated_at: fila.updated_at,
  };
}

export async function listarClientesAdmin({
  busqueda,
  pagina,
  porPagina,
}: FiltrosClientesAdmin): Promise<ResultadoClientesAdmin> {
  const { data, error } = await supabase.rpc("listar_clientes_admin", {
    p_q: busqueda.trim(),
    p_limit: porPagina,
    p_offset: (pagina - 1) * porPagina,
  });

  if (error) throw error;

  const filas = (data ?? []) as FilaClienteAdmin[];
  const total = filas.length > 0 ? Number(filas[0].total ?? 0) : 0;

  return {
    clientes: filas.map(filaACliente),
    total,
  };
}

export async function actualizarClienteAdmin(
  datos: DatosEdicionCliente,
): Promise<Cliente> {
  const { data, error } = await supabase.rpc("actualizar_cliente", {
    p_id: datos.id,
    p_nombre: datos.nombre,
    p_telefono: datos.telefono || null,
    p_email: datos.email || null,
    p_notas: datos.notas || null,
    p_rfc: datos.rfc || null,
  });

  if (error) throw error;

  const fila = (Array.isArray(data) ? data[0] : data) as FilaClienteAdmin | null;
  if (!fila) throw new Error("No se pudo actualizar el cliente");

  return filaACliente(fila);
}

function construirConsultaCompras(
  clienteId: string,
  desde: string,
  hasta: string,
) {
  return supabase
    .from("pedidos")
    .select(
      "id, numero_pedido, cliente_nombre, fecha_recepcion, hora_recepcion, fecha_entrega, hora_entrega, estado, metodo_pago, subtotal, anticipo, total, saldo_cobrado, saldo_metodo_pago, saldo_cobrado_en, detalle_pedidos(producto_nombre, cantidad, precio_unitario, importe_linea, atributos)",
    )
    .eq("cliente_id", clienteId)
    .gte("fecha_recepcion", desde)
    .lte("fecha_recepcion", hasta)
    .order("fecha_recepcion", { ascending: false })
    .order("hora_recepcion", { ascending: false });
}

const TAMANO_LOTE = 1000;

export async function listarComprasCliente({
  clienteId,
  desde,
  hasta,
}: {
  clienteId: string;
  desde: string;
  hasta: string;
}): Promise<CompraCliente[]> {
  const compras: CompraCliente[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await construirConsultaCompras(
      clienteId,
      desde,
      hasta,
    ).range(offset, offset + TAMANO_LOTE - 1);

    if (error) throw error;

    const lote = (data ?? []) as unknown as CompraCliente[];
    compras.push(...lote);
    if (lote.length < TAMANO_LOTE) break;
    offset += TAMANO_LOTE;
  }

  return compras;
}

export function resumirCompras(compras: CompraCliente[]): ResumenCompras {
  const validas = compras.filter((compra) => compra.estado !== "cancelado");
  const totalGastado = validas.reduce(
    (suma, compra) => suma + Number(compra.total ?? 0),
    0,
  );

  const ultima = validas.reduce<CompraCliente | null>((actual, compra) => {
    if (!actual) return compra;
    const claveActual = `${actual.fecha_recepcion} ${actual.hora_recepcion}`;
    const claveCompra = `${compra.fecha_recepcion} ${compra.hora_recepcion}`;
    return claveCompra > claveActual ? compra : actual;
  }, null);

  return {
    totalCompras: validas.length,
    totalGastado,
    ticketPromedio: validas.length > 0 ? totalGastado / validas.length : 0,
    ultimaCompra: ultima?.fecha_recepcion ?? null,
  };
}

function resumirProductos(compra: CompraCliente): string {
  return (compra.detalle_pedidos ?? [])
    .map((detalle) => `${detalle.cantidad}x ${detalle.producto_nombre}`)
    .join("; ");
}

function saldoPendiente(compra: CompraCliente): number {
  if (compra.estado === "cancelado" || compra.saldo_cobrado) return 0;
  return Math.max(0, Number(compra.total ?? 0) - Number(compra.anticipo ?? 0));
}

export function filasCsvCompras(compras: CompraCliente[]): CeldaCSV[][] {
  const encabezado: CeldaCSV[] = [
    "Pedido",
    "Fecha",
    "Hora",
    "Entrega",
    "Estado",
    "Método de pago",
    "Subtotal",
    "Anticipo",
    "Total",
    "Saldo pendiente",
    "Productos",
  ];

  return [
    encabezado,
    ...compras.map((compra) => [
      compra.numero_pedido ?? compra.id,
      compra.fecha_recepcion,
      compra.hora_recepcion,
      `${compra.fecha_entrega} ${compra.hora_entrega}`,
      compra.estado,
      compra.metodo_pago,
      Number(compra.subtotal ?? 0).toFixed(2),
      Number(compra.anticipo ?? 0).toFixed(2),
      Number(compra.total ?? 0).toFixed(2),
      saldoPendiente(compra).toFixed(2),
      resumirProductos(compra),
    ]),
  ];
}
