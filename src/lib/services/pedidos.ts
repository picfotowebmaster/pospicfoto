import { supabase } from "../supabase/client";
import type { PedidoDraft, Pedido, MetodoPago, RutaProduccion, LineaPedidoDraft } from "../supabase/types";
import { upsertHistorial } from "./historial";

export interface FiltrosPedidos {
  pagina: number;
  porPagina: number;
  busqueda?: string;
  numeroPedido?: string;
  estado?: string;
  metodoPago?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  requiereCorreccion?: string;
  areaActual?: string;
}

export async function crearPedido(draft: PedidoDraft, cajeroId: string): Promise<string> {
  const { data: marca } = await supabase
    .from("marcas")
    .select("codigo")
    .eq("id", draft.marca_id)
    .single();

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("codigo")
    .eq("id", draft.sucursal_id)
    .single();

  if (!marca || !sucursal) throw new Error("Marca o sucursal no encontrada");

  const { data: numData, error: numErr } = await supabase
    .rpc("generar_numero_pedido", {
      marca_codigo: marca.codigo,
      sucursal_codigo: sucursal.codigo,
    });

  if (numErr) throw numErr;

  const { data: pedido, error: pedidoErr } = await supabase
    .from("pedidos")
    .insert({
      cajero_id: cajeroId,
      cliente_nombre: draft.cliente_nombre,
      cliente_telefono: draft.cliente_telefono || null,
      fecha_entrega: draft.fecha_entrega,
      hora_entrega: draft.hora_entrega,
      requiere_correccion: draft.requiere_correccion,
      subtotal: draft.subtotal,
      anticipo: draft.anticipo,
      total: draft.total,
      metodo_pago: draft.metodo_pago,
      ruta: draft.ruta,
      area_actual: "mostrador",
      sucursal_id: draft.sucursal_id,
      marca_id: draft.marca_id,
      numero_pedido: numData,
    })
    .select()
    .single();

  if (pedidoErr) throw pedidoErr;

  const detalles = draft.lineas.map((l) => ({
    pedido_id: pedido.id,
    producto_nombre: l.producto_nombre,
    cantidad: l.cantidad,
    precio_unitario: l.precio_unitario,
    importe_linea: l.cantidad * l.precio_unitario,
    atributos: l.atributos,
  }));

  const { error: detalleErr } = await supabase
    .from("detalle_pedidos")
    .insert(detalles);

  if (detalleErr) throw detalleErr;

  for (const l of draft.lineas) {
    await upsertHistorial(l.producto_nombre, l.atributos).catch(() => {});
  }

  return pedido.numero_pedido;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchPedido(id: string): Promise<Pedido> {
  const column = UUID_RE.test(id) ? "id" : "numero_pedido";
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, detalle_pedidos(*)")
    .eq(column, id)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchPedidosPorEstado(
  estados: string[],
): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, detalle_pedidos(*)")
    .in("estado", estados)
    .order("fecha_entrega", { ascending: true })
    .order("hora_entrega", { ascending: true });

  if (error) throw error;
  return data;
}

const ESTADO_A_AREA: Record<string, string | null> = {
  pendiente: "mostrador",
  en_taller: null,
  en_corte: "corte",
  listo: "listo",
  entregado: "entregado",
  cancelado: null,
};

async function cambiarEstadoConMovimiento(
  pedidoId: string,
  nuevoEstado: string,
): Promise<void> {
  const { data: pedido, error: fetchErr } = await supabase
    .from("pedidos")
    .select("area_actual")
    .eq("id", pedidoId)
    .single();

  if (fetchErr || !pedido) throw new Error("Pedido no encontrado");

  const oldArea = pedido.area_actual as string;
  const newArea = ESTADO_A_AREA[nuevoEstado] ?? oldArea;

  const { error: updateErr } = await supabase
    .from("pedidos")
    .update({ estado: nuevoEstado, area_actual: newArea })
    .eq("id", pedidoId);

  if (updateErr) throw updateErr;

  const idOperador = (await supabase.auth.getUser()).data.user?.id ?? null;

  const { error: movErr } = await supabase
    .from("pedido_movimientos")
    .insert({
      pedido_id: pedidoId,
      from_area: oldArea,
      to_area: newArea,
      operador_id: idOperador,
    });

  if (movErr) throw movErr;
}

export async function actualizarEstadoPedido(
  id: string,
  estado: string,
): Promise<void> {
  await cambiarEstadoConMovimiento(id, estado);
}

export async function cancelarPedido(id: string): Promise<void> {
  await cambiarEstadoConMovimiento(id, "cancelado");
}

export async function actualizarPedido(
  id: string,
  data: {
    cliente_nombre: string;
    cliente_telefono?: string;
    fecha_entrega: string;
    hora_entrega: string;
    requiere_correccion: boolean;
    subtotal: number;
    anticipo: number;
    total: number;
    metodo_pago: MetodoPago;
    ruta: RutaProduccion;
    lineas: LineaPedidoDraft[];
  },
): Promise<void> {
  const { error: pedidoErr } = await supabase
    .from("pedidos")
    .update({
      cliente_nombre: data.cliente_nombre,
      cliente_telefono: data.cliente_telefono || null,
      fecha_entrega: data.fecha_entrega,
      hora_entrega: data.hora_entrega,
      requiere_correccion: data.requiere_correccion,
      subtotal: data.subtotal,
      anticipo: data.anticipo,
      total: data.total,
      metodo_pago: data.metodo_pago,
      ruta: data.ruta,
    })
    .eq("id", id);

  if (pedidoErr) throw pedidoErr;

  const { error: deleteErr } = await supabase
    .from("detalle_pedidos")
    .delete()
    .eq("pedido_id", id);

  if (deleteErr) throw deleteErr;

  const detalles = data.lineas.map((l) => ({
    pedido_id: id,
    producto_nombre: l.producto_nombre,
    cantidad: l.cantidad,
    precio_unitario: l.precio_unitario,
    importe_linea: l.cantidad * l.precio_unitario,
    atributos: l.atributos,
  }));

  if (detalles.length > 0) {
    const { error: insertErr } = await supabase
      .from("detalle_pedidos")
      .insert(detalles);

    if (insertErr) throw insertErr;
  }

  for (const l of data.lineas) {
    await upsertHistorial(l.producto_nombre, l.atributos).catch(() => {});
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aplicarFiltros(query: any, filtros: FiltrosPedidos) {
  let q = query;
  if (filtros.busqueda) {
    q = q.ilike("cliente_nombre", `%${filtros.busqueda}%`);
  }
  if (filtros.numeroPedido) {
    q = q.ilike("numero_pedido", `%${filtros.numeroPedido}%`);
  }
  if (filtros.estado) {
    q = q.eq("estado", filtros.estado);
  }
  if (filtros.metodoPago) {
    q = q.eq("metodo_pago", filtros.metodoPago);
  }
  if (filtros.fechaDesde) {
    q = q.gte("fecha_entrega", filtros.fechaDesde);
  }
  if (filtros.fechaHasta) {
    q = q.lte("fecha_entrega", filtros.fechaHasta);
  }
  if (filtros.requiereCorreccion === "si") {
    q = q.eq("requiere_correccion", true);
  } else if (filtros.requiereCorreccion === "no") {
    q = q.eq("requiere_correccion", false);
  }
  if (filtros.areaActual) {
    q = q.eq("area_actual", filtros.areaActual);
  }
  return q;
}

export async function listarPedidos(
  filtros: FiltrosPedidos,
): Promise<{ pedidos: Pedido[]; hasMore: boolean }> {
  const from = (filtros.pagina - 1) * filtros.porPagina;
  const to = from + filtros.porPagina;

  const { data, error } = await aplicarFiltros(
    supabase.from("pedidos").select("*, detalle_pedidos(*)"),
    filtros,
  )
    .order("fecha_entrega", { ascending: false })
    .order("hora_entrega", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const pedidos = (data ?? []) as Pedido[];
  const hasMore = pedidos.length > filtros.porPagina;

  return { pedidos: pedidos.slice(0, filtros.porPagina), hasMore };
}
