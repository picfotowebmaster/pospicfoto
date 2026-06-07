import { supabase } from "../supabase/client";
import type { PedidoDraft, Pedido, DetallePedido } from "../supabase/types";
import { upsertHistorial } from "./historial";

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
