import { supabase } from "../supabase/client";
import type { WorkflowRoute, PedidoMovimiento, AreaProduccion } from "../supabase/types";

interface NextAreaResult {
  destination: string;
  multiple: boolean;
}

export async function fetchProductionAreas() {
  const { data, error } = await supabase
    .from("production_areas")
    .select("*")
    .order("orden");

  if (error) {
    console.error("PostgREST error:", error.code, error.message, error.details);
    throw error;
  }
  return data;
}

export async function fetchWorkflowRoutes() {
  const { data, error } = await supabase
    .from("workflow_routes")
    .select("*");

  if (error) throw error;
  return data as WorkflowRoute[];
}

export async function getNextAreas(
  fromArea: string,
  ruta: string,
): Promise<NextAreaResult[]> {
  const { data, error } = await supabase
    .from("workflow_routes")
    .select("*")
    .eq("from_area", fromArea)
    .eq("ruta", ruta);

  if (error) throw error;

  if (!data || data.length === 0) return [];

  return (data as WorkflowRoute[]).map((row) => ({
    destination: row.to_area,
    multiple: row.multiple,
  }));
}

export async function advancePedido(
  pedidoId: string,
  destino?: string,
): Promise<PedidoMovimiento> {
  const { data: pedido, error: pedidoErr } = await supabase
    .from("pedidos")
    .select("area_actual, ruta")
    .eq("id", pedidoId)
    .single();

  if (pedidoErr || !pedido) throw new Error("Pedido no encontrado");

  const currentArea = pedido.area_actual as string;
  const ruta = pedido.ruta as string;

  const nextAreas = await getNextAreas(currentArea, ruta);

  if (nextAreas.length === 0) {
    return finalizePedido(pedidoId, currentArea);
  }

  const hasMultiple = nextAreas.some((n) => n.multiple);

  let nextArea: string;

  if (hasMultiple) {
    if (!destino) {
      throw new Error("Debe seleccionar un destino para continuar");
    }
    const valid = nextAreas.find((n) => n.destination === destino);
    if (!valid) {
      throw new Error(`"${destino}" no es un destino válido desde "${currentArea}"`);
    }
    nextArea = destino;
  } else {
    nextArea = nextAreas[0].destination;
  }

  const movimiento = await movePedido(pedidoId, currentArea, nextArea, destino ?? null);
  return movimiento;
}

async function finalizePedido(
  pedidoId: string,
  currentArea: string,
): Promise<PedidoMovimiento> {
  return movePedido(pedidoId, currentArea, "listo", null);
}

async function movePedido(
  pedidoId: string,
  fromArea: string,
  toArea: string,
  areaDestino: string | null,
): Promise<PedidoMovimiento> {
  const updateData: Record<string, string | null> = {
    area_actual: toArea,
    estado: toArea === "listo" ? "listo" : "en_taller",
  };

  if (areaDestino) {
    updateData.area_destino = areaDestino;
  }

  const { error: updateErr } = await supabase
    .from("pedidos")
    .update(updateData)
    .eq("id", pedidoId);

  if (updateErr) throw updateErr;

  const idOperador = (await supabase.auth.getUser()).data.user?.id;

  const { data: movimiento, error: movErr } = await supabase
    .from("pedido_movimientos")
    .insert({
      pedido_id: pedidoId,
      from_area: fromArea,
      to_area: toArea,
      operador_id: idOperador || null,
    })
    .select()
    .single();

  if (movErr) throw movErr;

  return movimiento as PedidoMovimiento;
}

export async function fetchPedidosByArea(
  areas: AreaProduccion[],
) {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, detalle_pedidos(*)")
    .in("area_actual", areas)
    .order("fecha_entrega", { ascending: true })
    .order("hora_entrega", { ascending: true });

  if (error) throw error;
  return data;
}

export async function fetchUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data?.rol ?? null;
}
