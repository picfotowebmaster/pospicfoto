import { supabase } from "../supabase/client";
import type { PedidoReporteContable, RangoReporte } from "../utils/reportesContables";

const CAMPOS =
  "id, numero_pedido, cliente_nombre, cliente_rfc, cajero_id, sucursal_id, marca_id, fecha_recepcion, estado, subtotal, anticipo, total, metodo_pago, saldo_cobrado, saldo_metodo_pago, saldo_cobrado_en, saldo_cobrado_por, reembolso_estado, reembolso_monto, reembolso_realizado_en, reembolso_realizado_por, factura_folio, factura_uuid, factura_estado, factura_fecha, pagos_pedido(tipo, metodo_pago, monto, cobrado_por, cobrado_en)";

const TAMANO_LOTE = 1000;

function construirConsulta(
  rango: RangoReporte,
  sucursalId?: string | null,
  marcaId?: string | null,
) {
  let consulta = supabase
    .from("pedidos")
    .select(CAMPOS)
    .or(
      `and(fecha_recepcion.gte.${rango.desde},fecha_recepcion.lte.${rango.hasta}),and(saldo_cobrado_en.gte.${rango.desde}T00:00:00-06:00,saldo_cobrado_en.lte.${rango.hasta}T23:59:59.999-06:00),and(reembolso_realizado_en.gte.${rango.desde}T00:00:00-06:00,reembolso_realizado_en.lte.${rango.hasta}T23:59:59.999-06:00)`,
    );

  if (sucursalId) {
    consulta = consulta.eq("sucursal_id", sucursalId);
  }

  if (marcaId) {
    consulta = consulta.eq("marca_id", marcaId);
  }

  return consulta.order("fecha_recepcion", { ascending: true });
}

export async function obtenerPedidosReporte(
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
    ).range(
      offset,
      offset + TAMANO_LOTE - 1,
    );

    if (error) throw error;

    const lote = (data ?? []) as unknown as PedidoReporteContable[];
    pedidos.push(...lote);
    if (lote.length < TAMANO_LOTE) break;
    offset += TAMANO_LOTE;
  }

  return pedidos;
}
