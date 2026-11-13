import { supabase } from "../supabase/client";
import type { PedidoDraft, Pedido, MetodoPago, RutaProduccion, LineaPedidoDraft, PrioridadPedido, DatosFiscalesPedido } from "../supabase/types";
import { upsertHistorial } from "./historial";
import { guardarClienteFiscal } from "./clientesFiscales";
import { guardarCliente } from "./clientes";
import { fechaNegocio, horaNegocio } from "../utils/fechas";

interface EntidadResuelta {
  marcaId: string;
  sucursalId: string;
  marcaCodigo: string;
  sucursalCodigo: string;
  entidadEmisoraId: string | null;
}

async function resolverEntidadEmisora(draft: {
  entidad_emisora_id?: string;
  marca_id: string;
  sucursal_id: string;
}): Promise<EntidadResuelta> {
  let marcaId = draft.marca_id;
  let sucursalId = draft.sucursal_id;
  let entidadEmisoraId: string | null = null;

  if (draft.entidad_emisora_id) {
    const { data: entidad, error } = await supabase
      .from("entidades_emisoras")
      .select("id, marca_id, sucursal_id")
      .eq("id", draft.entidad_emisora_id)
      .maybeSingle();

    if (error) throw error;
    if (!entidad) throw new Error("Entidad emisora no encontrada");

    entidadEmisoraId = entidad.id;
    marcaId = entidad.marca_id || marcaId;
    sucursalId = entidad.sucursal_id || sucursalId;
  }

  const { data: marca } = await supabase
    .from("marcas")
    .select("codigo")
    .eq("id", marcaId)
    .single();

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("codigo")
    .eq("id", sucursalId)
    .single();

  if (!marca || !sucursal) throw new Error("Marca o sucursal no encontrada");

  return {
    marcaId,
    sucursalId,
    marcaCodigo: marca.codigo,
    sucursalCodigo: sucursal.codigo,
    entidadEmisoraId,
  };
}

export interface FiltrosPedidos {
  pagina: number;
  porPagina: number;
  busqueda?: string;
  numeroPedido?: string;
  estado?: string;
  metodoPago?: string;
  vendedorId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  requiereCorreccion?: string;
  areaActual?: string;
}

export async function crearPedido(draft: PedidoDraft, cajeroId: string): Promise<string> {
  const entidad = await resolverEntidadEmisora(draft);

  const { data: numData, error: numErr } = await supabase
    .rpc("generar_numero_pedido", {
      marca_codigo: entidad.marcaCodigo,
      sucursal_codigo: entidad.sucursalCodigo,
    });

  if (numErr) throw numErr;

  const { data: pedido, error: pedidoErr } = await supabase
    .from("pedidos")
    .insert({
      cajero_id: cajeroId,
      cliente_nombre: draft.cliente_nombre,
      cliente_telefono: draft.cliente_telefono || null,
      cliente_email: draft.cliente_email || null,
      requiere_factura: draft.requiere_factura ?? false,
      cliente_rfc: draft.cliente_rfc || null,
      cliente_razon_social: draft.cliente_razon_social || null,
      cliente_regimen_fiscal: draft.cliente_regimen_fiscal || null,
      cliente_uso_cfdi: draft.cliente_uso_cfdi || null,
      cliente_cp_fiscal: draft.cliente_cp_fiscal || null,
      fecha_recepcion: draft.fecha_recepcion ?? fechaNegocio(),
      hora_recepcion: draft.hora_recepcion ?? horaNegocio(),
      fecha_pago_total:
        draft.total > 0 && draft.anticipo >= draft.total
          ? new Date().toISOString()
          : null,
      fecha_entrega: draft.fecha_entrega,
      hora_entrega: draft.hora_entrega,
      requiere_correccion: draft.requiere_correccion,
      subtotal: draft.subtotal,
      anticipo: draft.anticipo,
      total: draft.total,
      metodo_pago: draft.metodo_pago,
      ruta: draft.ruta,
      area_actual: "mostrador",
      sucursal_id: entidad.sucursalId,
      marca_id: entidad.marcaId,
      entidad_emisora_id: entidad.entidadEmisoraId,
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
    precio_lista: l.precio_lista ?? null,
    ...(l.descuento_monto != null && l.descuento_monto > 0
      ? {
          descuento_id: l.descuento_id || null,
          descuento_nombre: l.descuento_nombre ?? null,
          descuento_tipo: l.descuento_tipo ?? null,
          descuento_valor: l.descuento_valor ?? null,
          descuento_monto: l.descuento_monto ?? null,
        }
      : {}),
    importe_linea: l.cantidad * l.precio_unitario,
    atributos: l.atributos,
    categoria_id: l.categoria_id ?? null,
    producto_id: l.producto_id ?? null,
  }));

  const { error: detalleErr } = await supabase
    .from("detalle_pedidos")
    .insert(detalles);

  if (detalleErr) throw detalleErr;

  await Promise.all(
    draft.lineas.map((l) => upsertHistorial(l.producto_nombre, l.atributos).catch(() => {})),
  );

  await guardarCliente({
    nombre: draft.cliente_nombre,
    telefono: draft.cliente_telefono,
    email: draft.cliente_email,
    pedidoId: pedido.id,
    total: draft.total,
  }).catch(() => {});

  await guardarClienteFiscal({
    ...draft,
    email: draft.cliente_email,
    telefono: draft.cliente_telefono,
  }).catch(() => {});

  return pedido.numero_pedido;
}

async function insertarSubPedido(
  cajeroId: string,
  marcaCodigo: string,
  sucursalCodigo: string,
  draft: DatosFiscalesPedido & {
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_email?: string;
    fecha_recepcion?: string;
    hora_recepcion?: string;
    fecha_entrega: string;
    hora_entrega: string;
    requiere_correccion: boolean;
    metodo_pago: MetodoPago;
    ruta: RutaProduccion;
    sucursal_id: string;
    marca_id: string;
    entidad_emisora_id?: string | null;
    subtotal: number;
    anticipo: number;
    total: number;
  },
  lineas: LineaPedidoDraft[],
  facturaNumero: string,
): Promise<string> {
  const { data: numData, error: numErr } = await supabase
    .rpc("generar_numero_pedido", {
      marca_codigo: marcaCodigo,
      sucursal_codigo: sucursalCodigo,
    });

  if (numErr) throw numErr;

  const { data: pedido, error: pedidoErr } = await supabase
    .from("pedidos")
    .insert({
      cajero_id: cajeroId,
      cliente_nombre: draft.cliente_nombre,
      cliente_telefono: draft.cliente_telefono || null,
      cliente_email: draft.cliente_email || null,
      requiere_factura: draft.requiere_factura ?? false,
      cliente_rfc: draft.cliente_rfc || null,
      cliente_razon_social: draft.cliente_razon_social || null,
      cliente_regimen_fiscal: draft.cliente_regimen_fiscal || null,
      cliente_uso_cfdi: draft.cliente_uso_cfdi || null,
      cliente_cp_fiscal: draft.cliente_cp_fiscal || null,
      fecha_recepcion: draft.fecha_recepcion ?? fechaNegocio(),
      hora_recepcion: draft.hora_recepcion ?? horaNegocio(),
      fecha_pago_total:
        draft.total > 0 && draft.anticipo >= draft.total
          ? new Date().toISOString()
          : null,
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
      entidad_emisora_id: draft.entidad_emisora_id || null,
      numero_pedido: numData,
      factura_numero: facturaNumero,
    })
    .select()
    .single();

  if (pedidoErr) throw pedidoErr;

  const detalles = lineas.map((l) => ({
    pedido_id: pedido.id,
    producto_nombre: l.producto_nombre,
    cantidad: l.cantidad,
    precio_unitario: l.precio_unitario,
    precio_lista: l.precio_lista ?? null,
    ...(l.descuento_monto != null && l.descuento_monto > 0
      ? {
          descuento_id: l.descuento_id || null,
          descuento_nombre: l.descuento_nombre ?? null,
          descuento_tipo: l.descuento_tipo ?? null,
          descuento_valor: l.descuento_valor ?? null,
          descuento_monto: l.descuento_monto ?? null,
        }
      : {}),
    importe_linea: l.cantidad * l.precio_unitario,
    atributos: l.atributos,
    categoria_id: l.categoria_id ?? null,
    producto_id: l.producto_id ?? null,
  }));

  const { error: detalleErr } = await supabase
    .from("detalle_pedidos")
    .insert(detalles);

  if (detalleErr) throw detalleErr;

  await Promise.all(
    lineas.map((l) => upsertHistorial(l.producto_nombre, l.atributos).catch(() => {})),
  );

  await guardarCliente({
    nombre: draft.cliente_nombre,
    telefono: draft.cliente_telefono,
    email: draft.cliente_email,
    pedidoId: pedido.id,
    total: draft.total,
  }).catch(() => {});

  return pedido.numero_pedido;
}

export interface DraftAgrupado extends DatosFiscalesPedido {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string;
  fecha_recepcion?: string;
  hora_recepcion?: string;
  fecha_entrega: string;
  hora_entrega: string;
  requiere_correccion: boolean;
  lineas: LineaPedidoDraft[];
  subtotal: number;
  anticipo: number;
  total: number;
  metodo_pago: MetodoPago;
  sucursal_id: string;
  marca_id: string;
  entidad_emisora_id?: string;
}

export async function crearPedidoAgrupado(draft: DraftAgrupado, cajeroId: string): Promise<{ facturaNumero: string; pedidoIds: string[] }> {
  const entidad = await resolverEntidadEmisora(draft);

  const groups: Record<string, LineaPedidoDraft[]> = {};
  for (const l of draft.lineas) {
    if (!groups[l.ruta]) groups[l.ruta] = [];
    groups[l.ruta].push(l);
  }

  const rutas = Object.keys(groups);

  if (rutas.length === 1) {
    const ruta = rutas[0] as RutaProduccion;
    const numeroPedido = await crearPedido(
      {
        cliente_nombre: draft.cliente_nombre,
        cliente_telefono: draft.cliente_telefono,
        cliente_email: draft.cliente_email,
        fecha_recepcion: draft.fecha_recepcion,
        hora_recepcion: draft.hora_recepcion,
        requiere_factura: draft.requiere_factura,
        cliente_rfc: draft.cliente_rfc,
        cliente_razon_social: draft.cliente_razon_social,
        cliente_regimen_fiscal: draft.cliente_regimen_fiscal,
        cliente_uso_cfdi: draft.cliente_uso_cfdi,
        cliente_cp_fiscal: draft.cliente_cp_fiscal,
        fecha_entrega: draft.fecha_entrega,
        hora_entrega: draft.hora_entrega,
        requiere_correccion: draft.requiere_correccion,
        lineas: draft.lineas,
        subtotal: draft.subtotal,
        anticipo: draft.anticipo,
        total: draft.total,
        metodo_pago: draft.metodo_pago,
        ruta,
        sucursal_id: entidad.sucursalId,
        marca_id: entidad.marcaId,
        entidad_emisora_id: entidad.entidadEmisoraId ?? undefined,
      },
      cajeroId,
    );
    return { facturaNumero: numeroPedido, pedidoIds: [numeroPedido] };
  }

  const { data: facturaData, error: facturaNumErr } = await supabase
    .rpc("generar_numero_pedido", {
      marca_codigo: entidad.marcaCodigo,
      sucursal_codigo: entidad.sucursalCodigo,
    });

  if (facturaNumErr) throw facturaNumErr;
  const facturaNumero: string = facturaData;

  const pedidoIds: string[] = [];

  for (const ruta of rutas) {
    const lineasRuta = groups[ruta];
    const factor = lineasRuta.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0) / draft.subtotal;

    const pedidoId = await insertarSubPedido(
      cajeroId,
      entidad.marcaCodigo,
      entidad.sucursalCodigo,
      {
        cliente_nombre: draft.cliente_nombre,
        cliente_telefono: draft.cliente_telefono,
        cliente_email: draft.cliente_email,
        fecha_recepcion: draft.fecha_recepcion,
        hora_recepcion: draft.hora_recepcion,
        requiere_factura: draft.requiere_factura,
        cliente_rfc: draft.cliente_rfc,
        cliente_razon_social: draft.cliente_razon_social,
        cliente_regimen_fiscal: draft.cliente_regimen_fiscal,
        cliente_uso_cfdi: draft.cliente_uso_cfdi,
        cliente_cp_fiscal: draft.cliente_cp_fiscal,
        fecha_entrega: draft.fecha_entrega,
        hora_entrega: draft.hora_entrega,
        requiere_correccion: draft.requiere_correccion,
        metodo_pago: draft.metodo_pago,
        ruta: ruta as RutaProduccion,
        sucursal_id: entidad.sucursalId,
        marca_id: entidad.marcaId,
        entidad_emisora_id: entidad.entidadEmisoraId,
        subtotal: Math.round(draft.subtotal * factor * 100) / 100,
        anticipo: Math.round(draft.anticipo * factor * 100) / 100,
        total: Math.round(draft.total * factor * 100) / 100,
      },
      lineasRuta,
      facturaNumero,
    );
    pedidoIds.push(pedidoId);
  }

  await guardarClienteFiscal({
    ...draft,
    email: draft.cliente_email,
    telefono: draft.cliente_telefono,
  }).catch(() => {});

  return { facturaNumero, pedidoIds };
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

export async function actualizarEstadoPedido(
  id: string,
  estado: string,
): Promise<void> {
  if (estado === "cancelado") {
    await cancelarPedido(id);
    return;
  }

  const { data: pedido, error: fetchErr } = await supabase
    .from("pedidos")
    .select("area_actual")
    .eq("id", id)
    .single();

  if (fetchErr || !pedido) throw new Error("Pedido no encontrado");

  const oldArea = pedido.area_actual as string;
  const newArea = ESTADO_A_AREA[estado] ?? oldArea;

  if (newArea && newArea !== oldArea) {
    const { movePedido } = await import("./workflow");
    await movePedido(id, oldArea, newArea, null);
  } else {
    const { error: updateErr } = await supabase
      .from("pedidos")
      .update({ estado })
      .eq("id", id);

    if (updateErr) throw updateErr;

    const idOperador = (await supabase.auth.getUser()).data.user?.id ?? null;

    const { error: movErr } = await supabase
      .from("pedido_movimientos")
      .insert({
        pedido_id: id,
        from_area: oldArea,
        to_area: oldArea,
        operador_id: idOperador,
      });

    if (movErr) throw movErr;
  }
}

export async function cancelarPedido(id: string): Promise<void> {
  const { data: pedido, error: fetchErr } = await supabase
    .from("pedidos")
    .select("area_actual")
    .eq("id", id)
    .single();

  if (fetchErr || !pedido) throw new Error("Pedido no encontrado");

  const oldArea = pedido.area_actual as string;

  const { error: updateErr } = await supabase
    .from("pedidos")
    .update({ estado: "cancelado" })
    .eq("id", id);

  if (updateErr) throw updateErr;

  const idOperador = (await supabase.auth.getUser()).data.user?.id ?? null;

  const { error: movErr } = await supabase
    .from("pedido_movimientos")
    .insert({
      pedido_id: id,
      from_area: oldArea,
      to_area: oldArea,
      operador_id: idOperador,
    });

  if (movErr) throw movErr;
}

export async function actualizarPedido(
  id: string,
  data: {
    cliente_nombre: string;
    cliente_telefono?: string;
    cliente_email?: string;
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
      cliente_email: data.cliente_email || null,
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
    precio_lista: l.precio_lista ?? null,
    ...(l.descuento_monto != null && l.descuento_monto > 0
      ? {
          descuento_id: l.descuento_id || null,
          descuento_nombre: l.descuento_nombre ?? null,
          descuento_tipo: l.descuento_tipo ?? null,
          descuento_valor: l.descuento_valor ?? null,
          descuento_monto: l.descuento_monto ?? null,
        }
      : {}),
    importe_linea: l.cantidad * l.precio_unitario,
    atributos: l.atributos,
    categoria_id: l.categoria_id ?? null,
    producto_id: l.producto_id ?? null,
  }));

  if (detalles.length > 0) {
    const { error: insertErr } = await supabase
      .from("detalle_pedidos")
      .insert(detalles);

    if (insertErr) throw insertErr;
  }

  await Promise.all(
    data.lineas.map((l) => upsertHistorial(l.producto_nombre, l.atributos).catch(() => {})),
  );
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
  if (filtros.vendedorId === "sin_vendedor") {
    q = q.is("cajero_id", null);
  } else if (filtros.vendedorId) {
    q = q.eq("cajero_id", filtros.vendedorId);
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

export { buscarClientes } from "./clientes";
export type { ClienteHistorial } from "./clientes";

export async function liquidarSaldo(
  id: string,
  metodo: MetodoPago,
  cobradoPorId: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      saldo_cobrado: true,
      saldo_metodo_pago: metodo,
      saldo_cobrado_en: new Date().toISOString(),
      saldo_cobrado_por: cobradoPorId,
      fecha_pago_total: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("saldo_cobrado", false)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("El saldo ya fue cobrado o el pedido no existe.");
  }
}

export async function actualizarPrioridad(
  id: string,
  prioridad: PrioridadPedido,
): Promise<void> {
  const { error } = await supabase
    .from("pedidos")
    .update({ prioridad })
    .eq("id", id);

  if (error) throw error;
}

export async function asignarPedido(
  id: string,
  usuarioId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("pedidos")
    .update({ asignado_a: usuarioId })
    .eq("id", id);

  if (error) throw error;
}

export async function actualizarNotas(
  id: string,
  notas: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("pedidos")
    .update({ notas: notas && notas.trim() !== "" ? notas : null })
    .eq("id", id);

  if (error) throw error;
}

export async function actualizarCorreccion(
  id: string,
  requiere: boolean,
  motivo: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("pedidos")
    .update({
      requiere_correccion: requiere,
      motivo_correccion: requiere && motivo && motivo.trim() !== "" ? motivo : null,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function contarPedidos(
  filtros: Omit<FiltrosPedidos, "pagina" | "porPagina">,
): Promise<number> {
  const { count, error } = await aplicarFiltros(
    supabase.from("pedidos").select("*", { count: "exact", head: true }),
    { ...filtros, pagina: 1, porPagina: 1 },
  );

  if (error) throw error;
  return count ?? 0;
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
