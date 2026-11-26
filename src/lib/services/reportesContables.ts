import { supabase } from "../supabase/client";
import type { PedidoReporteContable, RangoReporte } from "../utils/reportesContables";

const CAMPOS =
  "id, numero_pedido, cliente_nombre, cliente_rfc, cajero_id, sucursal_id, marca_id, fecha_recepcion, estado, subtotal, anticipo, total, metodo_pago, saldo_cobrado, saldo_metodo_pago, saldo_cobrado_en, saldo_cobrado_por, reembolso_estado, reembolso_monto, reembolso_realizado_en, reembolso_realizado_por, factura_folio, factura_uuid, factura_estado, factura_fecha, pagos_pedido(tipo, metodo_pago, monto, cobrado_por, cobrado_en)";

const TAMANO_LOTE = 1000;
const LOTE_IDS = 200;
const OFFSET_ZONA = "-06:00";

function inicioDia(fecha: string): string {
  return `${fecha}T00:00:00${OFFSET_ZONA}`;
}

function finDia(fecha: string): string {
  return `${fecha}T23:59:59.999${OFFSET_ZONA}`;
}

function construirConsulta(
  rango: RangoReporte,
  sucursalId?: string | null,
  marcaId?: string | null,
) {
  const desde = inicioDia(rango.desde);
  const hasta = finDia(rango.hasta);

  let consulta = supabase
    .from("pedidos")
    .select(CAMPOS)
    .or(
      `and(fecha_recepcion.gte.${rango.desde},fecha_recepcion.lte.${rango.hasta}),and(saldo_cobrado_en.gte.${desde},saldo_cobrado_en.lte.${hasta}),and(reembolso_realizado_en.gte.${desde},reembolso_realizado_en.lte.${hasta})`,
    );

  if (sucursalId) {
    consulta = consulta.eq("sucursal_id", sucursalId);
  }

  if (marcaId) {
    consulta = consulta.eq("marca_id", marcaId);
  }

  return consulta
    .order("fecha_recepcion", { ascending: true })
    .order("id", { ascending: true });
}

async function obtenerPedidosPorActividad(
  rango: RangoReporte,
  sucursalId?: string | null,
  marcaId?: string | null,
): Promise<PedidoReporteContable[]> {
  const pedidos: PedidoReporteContable[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await construirConsulta(
      rango,
      sucursalId,
      marcaId,
    ).range(offset, offset + TAMANO_LOTE - 1);

    if (error) throw error;

    const lote = (data ?? []) as unknown as PedidoReporteContable[];
    pedidos.push(...lote);
    if (lote.length < TAMANO_LOTE) break;
    offset += TAMANO_LOTE;
  }

  return pedidos;
}

async function obtenerIdsConPagosEnRango(
  rango: RangoReporte,
  sucursalId?: string | null,
  marcaId?: string | null,
): Promise<string[]> {
  const ids = new Set<string>();
  let offset = 0;

  while (true) {
    let consulta = supabase
      .from("pagos_pedido")
      .select("pedido_id, pedidos!inner(sucursal_id, marca_id)")
      .gte("cobrado_en", inicioDia(rango.desde))
      .lte("cobrado_en", finDia(rango.hasta));

    if (sucursalId) {
      consulta = consulta.eq("pedidos.sucursal_id", sucursalId);
    }

    if (marcaId) {
      consulta = consulta.eq("pedidos.marca_id", marcaId);
    }

    const { data, error } = await consulta
      .order("id", { ascending: true })
      .range(offset, offset + TAMANO_LOTE - 1);

    if (error) throw error;

    const lote = (data ?? []) as unknown as { pedido_id: string }[];
    for (const pago of lote) ids.add(pago.pedido_id);
    if (lote.length < TAMANO_LOTE) break;
    offset += TAMANO_LOTE;
  }

  return [...ids];
}

async function obtenerPedidosPorIds(
  ids: string[],
  sucursalId?: string | null,
  marcaId?: string | null,
): Promise<PedidoReporteContable[]> {
  const pedidos: PedidoReporteContable[] = [];

  for (let index = 0; index < ids.length; index += LOTE_IDS) {
    const loteIds = ids.slice(index, index + LOTE_IDS);

    let consulta = supabase
      .from("pedidos")
      .select(CAMPOS)
      .in("id", loteIds);

    if (sucursalId) {
      consulta = consulta.eq("sucursal_id", sucursalId);
    }

    if (marcaId) {
      consulta = consulta.eq("marca_id", marcaId);
    }

    const { data, error } = await consulta
      .order("id", { ascending: true })
      .range(0, LOTE_IDS - 1);

    if (error) throw error;

    pedidos.push(
      ...((data ?? []) as unknown as PedidoReporteContable[]),
    );
  }

  return pedidos;
}

export async function obtenerPedidosReporte(
  rango: RangoReporte,
  sucursalId?: string | null,
  marcaId?: string | null,
): Promise<PedidoReporteContable[]> {
  const pedidos = await obtenerPedidosPorActividad(
    rango,
    sucursalId,
    marcaId,
  );

  // Incluye pedidos con anticipos cobrados en el rango aunque su fecha de
  // recepción quede fuera (p. ej. venta anterior con anticipo registrado
  // después). El filtro principal solo cubre recepción, saldo y reembolsos.
  const idsConPagos = await obtenerIdsConPagosEnRango(
    rango,
    sucursalId,
    marcaId,
  );

  const incluidos = new Set(pedidos.map((pedido) => pedido.id));
  const faltantes = idsConPagos.filter((id) => !incluidos.has(id));

  if (faltantes.length > 0) {
    const extra = await obtenerPedidosPorIds(
      faltantes,
      sucursalId,
      marcaId,
    );
    pedidos.push(...extra);
  }

  return pedidos;
}
