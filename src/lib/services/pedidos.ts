import { supabase } from "../supabase/client";
import type { PedidoDraft, Pedido } from "../supabase/types";
import { upsertHistorial } from "./historial";

export interface FiltrosPedidos {
  pagina: number;
  porPagina: number;
  busqueda?: string;
  estado?: string;
  metodoPago?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  requiereCorreccion?: string;
}

export async function crearPedido(draft: PedidoDraft, cajeroId: string): Promise<string> {
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

  return pedido.id;
}

export async function fetchPedido(id: string): Promise<Pedido> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, detalle_pedidos(*)")
    .eq("id", id)
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

export async function actualizarEstadoPedido(
  id: string,
  estado: string,
): Promise<void> {
  const { error } = await supabase
    .from("pedidos")
    .update({ estado })
    .eq("id", id);

  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aplicarFiltros(query: any, filtros: FiltrosPedidos) {
  let q = query;
  if (filtros.busqueda) {
    q = q.ilike("cliente_nombre", `%${filtros.busqueda}%`);
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
