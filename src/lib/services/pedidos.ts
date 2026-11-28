import { supabase } from "../supabase/client";
import type {
  PedidoDraft,
  Pedido,
  MetodoPago,
  RutaProduccion,
  LineaPedidoDraft,
  PrioridadPedido,
  DatosFiscalesPedido,
  PagoDraft,
  TipoPagoPedido,
} from "../supabase/types";
import { upsertHistorial } from "./historial";
import { guardarClienteFiscal } from "./clientesFiscales";
import { guardarCliente } from "./clientes";
import { fechaNegocio, horaNegocio } from "../utils/fechas";
import {
  normalizarPagos,
  redondear2,
  repartirPagosProporcional,
  resumenMetodoPago,
  sumarPagos,
} from "../utils/pagos";

function pagosParaAnticipo(draft: {
  anticipo: number;
  metodo_pago: MetodoPago;
  pagos_anticipo?: PagoDraft[];
}): PagoDraft[] {
  const normalizados = normalizarPagos(draft.pagos_anticipo ?? []);
  if (normalizados.length > 0) return normalizados;
  const monto = redondear2(draft.anticipo);
  return monto > 0 ? [{ metodo: draft.metodo_pago, monto }] : [];
}

async function insertarPagosPedido(
  pedidoId: string,
  tipo: TipoPagoPedido,
  pagos: PagoDraft[],
  cobradoPorId: string | null,
  cobradoEn = new Date().toISOString(),
): Promise<void> {
  const filas = normalizarPagos(pagos).map((pago) => ({
    pedido_id: pedidoId,
    tipo,
    metodo_pago: pago.metodo,
    monto: pago.monto,
    cobrado_por: cobradoPorId,
    cobrado_en: cobradoEn,
  }));
  if (filas.length === 0) return;
  const { error } = await supabase.from("pagos_pedido").insert(filas);
  if (error) throw error;
}

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

export interface CambioPrecio {
  lineaId: string;
  productoNombre: string;
  precioAnterior: number;
  precioActual: number | null;
}

export class PrecioDesactualizadoError extends Error {
  readonly cambios: CambioPrecio[];

  constructor(cambios: CambioPrecio[]) {
    const detalle = cambios
      .map(
        (cambio) =>
          `${cambio.productoNombre} ($${cambio.precioAnterior.toFixed(2)} → ${
            cambio.precioActual === null
              ? "sin precio"
              : `$${cambio.precioActual.toFixed(2)}`
          })`,
      )
      .join(", ");
    super(
      `El precio cambió para: ${detalle}. Revisa la línea y vuelve a intentar.`,
    );
    this.name = "PrecioDesactualizadoError";
    this.cambios = cambios;
  }
}

function esPrecioManual(linea: LineaPedidoDraft): boolean {
  return (
    linea.descuento_id == null &&
    linea.precio_lista != null &&
    Number(linea.precio_unitario) !== Number(linea.precio_lista)
  );
}

export async function validarPreciosLineas(
  lineas: LineaPedidoDraft[],
): Promise<void> {
  const cambios: CambioPrecio[] = [];

  for (const linea of lineas) {
    if (!linea.producto_id) continue;
    if (linea.precio_lista == null) continue;
    if (linea.valores_ids === undefined || linea.valores_ids === null) continue;
    if (esPrecioManual(linea)) continue;

    const { data, error } = await supabase.rpc("precio_actual", {
      p_producto_id: linea.producto_id,
      p_valores_ids: linea.valores_ids,
    });

    if (error) {
      // No bloquear la venta por una falla de la validación.
      console.warn("No se pudo validar el precio:", error.message);
      continue;
    }

    const actual =
      data === null || data === undefined ? null : Number(data);
    const anterior = Number(linea.precio_lista);

    if (
      actual === null ||
      !Number.isFinite(actual) ||
      Math.abs(actual - anterior) > 0.009
    ) {
      cambios.push({
        lineaId: linea.id,
        productoNombre: linea.producto_nombre,
        precioAnterior: anterior,
        precioActual: actual,
      });
    }
  }

  if (cambios.length > 0) {
    throw new PrecioDesactualizadoError(cambios);
  }
}

export interface FiltrosPedidos {
  pagina: number;
  porPagina: number;
  busqueda?: string;
  numeroPedido?: string;
  estado?: string;
  metodoPago?: string;
  vendedorId?: string;
  sucursalId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  requiereCorreccion?: string;
  areaActual?: string;
}

export async function crearPedido(draft: PedidoDraft, cajeroId: string): Promise<string> {
  await validarPreciosLineas(draft.lineas);

  const entidad = await resolverEntidadEmisora(draft);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, marca_id, sucursal_id")
    .eq("id", cajeroId)
    .maybeSingle();

  if (perfil?.rol === "mostrador") {
    if (!perfil.marca_id || !perfil.sucursal_id) {
      throw new Error(
        "Tu perfil no tiene marca o sucursal asignada. Contacta al administrador.",
      );
    }

    if (entidad.marcaId !== perfil.marca_id) {
      throw new Error("Solo puedes vender la marca asignada a tu perfil.");
    }

    if (entidad.sucursalId !== perfil.sucursal_id) {
      throw new Error("Solo puedes vender en tu sucursal.");
    }
  }

  const { data: numData, error: numErr } = await supabase
    .rpc("generar_numero_pedido", {
      marca_codigo: entidad.marcaCodigo,
      sucursal_codigo: entidad.sucursalCodigo,
    });

  if (numErr) throw numErr;

  const pagosAnticipo = pagosParaAnticipo(draft);
  const metodoPagoPrincipal = resumenMetodoPago(pagosAnticipo, draft.metodo_pago);
  const anticipoFinal =
    pagosAnticipo.length > 0 ? sumarPagos(pagosAnticipo) : draft.anticipo;

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
        draft.total > 0 && anticipoFinal >= draft.total
          ? new Date().toISOString()
          : null,
      fecha_entrega: draft.fecha_entrega,
      hora_entrega: draft.hora_entrega,
      requiere_correccion: draft.requiere_correccion,
      subtotal: draft.subtotal,
      anticipo: anticipoFinal,
      total: draft.total,
      metodo_pago: metodoPagoPrincipal,
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

  await insertarPagosPedido(pedido.id, "anticipo", pagosAnticipo, cajeroId);

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
  }).catch((error) =>
    console.error("No se pudo guardar el cliente del pedido", error),
  );

  await guardarClienteFiscal({
    ...draft,
    email: draft.cliente_email,
    telefono: draft.cliente_telefono,
  }).catch((error) =>
    console.error("No se pudieron guardar los datos fiscales del cliente", error),
  );

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
  pagosAnticipo: PagoDraft[],
): Promise<string> {
  const { data: numData, error: numErr } = await supabase
    .rpc("generar_numero_pedido", {
      marca_codigo: marcaCodigo,
      sucursal_codigo: sucursalCodigo,
    });

  if (numErr) throw numErr;

  const metodoPagoPrincipal = resumenMetodoPago(pagosAnticipo, draft.metodo_pago);

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
      metodo_pago: metodoPagoPrincipal,
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

  await insertarPagosPedido(pedido.id, "anticipo", pagosAnticipo, cajeroId);

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
  }).catch((error) =>
    console.error("No se pudo guardar el cliente del pedido", error),
  );

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
  pagos_anticipo?: PagoDraft[];
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

  if (rutas.length > 1) {
    await validarPreciosLineas(draft.lineas);
  }

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
        pagos_anticipo: draft.pagos_anticipo,
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
    .rpc("generar_folio_venta", {
      marca_codigo: entidad.marcaCodigo,
      sucursal_codigo: entidad.sucursalCodigo,
    });

  if (facturaNumErr) throw facturaNumErr;
  const facturaNumero: string = facturaData;

  const pedidoIds: string[] = [];

  const factores = rutas.map((ruta) => {
    const lineasRuta = groups[ruta];
    const subtotalRuta = lineasRuta.reduce(
      (s, l) => s + l.cantidad * l.precio_unitario,
      0,
    );
    return draft.subtotal > 0 ? subtotalRuta / draft.subtotal : 0;
  });
  const pagosPorRuta = repartirPagosProporcional(
    pagosParaAnticipo(draft),
    factores,
  );

  for (let index = 0; index < rutas.length; index++) {
    const ruta = rutas[index];
    const lineasRuta = groups[ruta];
    const factor = factores[index];
    const pagosRuta = pagosPorRuta[index];
    const anticipoRuta = sumarPagos(pagosRuta);

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
        anticipo: anticipoRuta,
        total: Math.round(draft.total * factor * 100) / 100,
      },
      lineasRuta,
      facturaNumero,
      pagosRuta,
    );
    pedidoIds.push(pedidoId);
  }

  await guardarClienteFiscal({
    ...draft,
    email: draft.cliente_email,
    telefono: draft.cliente_telefono,
  }).catch((error) =>
    console.error("No se pudieron guardar los datos fiscales del cliente", error),
  );

  return { facturaNumero, pedidoIds };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchPedido(id: string): Promise<Pedido> {
  const column = UUID_RE.test(id) ? "id" : "numero_pedido";
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, detalle_pedidos(*), pagos_pedido(*)")
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
    throw new Error(
      "Usa el flujo de cancelación de venta para cancelar un pedido.",
    );
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

export interface AutorizacionAdmin {
  adminId: string;
  password: string;
}

export interface OpcionesCancelacionVenta {
  motivo: string;
  notas?: string | null;
  autorizacion?: AutorizacionAdmin;
}

export interface ResultadoCancelacionVenta {
  cancelados: number;
  autorizadoPor?: string | null;
}

export async function cancelarVenta(
  id: string,
  opciones: OpcionesCancelacionVenta,
): Promise<ResultadoCancelacionVenta> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error(
      "Sin conexión. Para cancelar una venta se requiere internet y autorización de un administrador o superadmin.",
    );
  }

  let res: Response;
  try {
    res = await fetch("/api/pedidos/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        motivo: opciones.motivo,
        notas: opciones.notas ?? null,
        adminId: opciones.autorizacion?.adminId,
        adminPassword: opciones.autorizacion?.password,
      }),
    });
  } catch {
    throw new Error(
      "No se pudo conectar. Verifica tu conexión e intenta de nuevo.",
    );
  }

  const data = (await res.json().catch(() => null)) as {
    error?: string;
    cancelados?: number;
    autorizadoPor?: string | null;
  } | null;

  if (!res.ok) {
    throw new Error(data?.error || "No se pudo cancelar la venta.");
  }

  return {
    cancelados: data?.cancelados ?? 0,
    autorizadoPor: data?.autorizadoPor ?? null,
  };
}

export async function registrarReembolso(
  id: string,
  notas?: string | null,
): Promise<void> {
  const column = UUID_RE.test(id) ? "id" : "numero_pedido";
  const { data: pedido, error: fetchErr } = await supabase
    .from("pedidos")
    .select("id")
    .eq(column, id)
    .single();

  if (fetchErr || !pedido) throw new Error("Pedido no encontrado");

  const { error } = await supabase.rpc("registrar_reembolso", {
    p_pedido_id: pedido.id,
    p_notas: notas ?? null,
  });

  if (error) throw error;
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

  let actualizadoPor: string | null = null;
  try {
    const authResult = await supabase.auth.getUser();
    actualizadoPor = authResult?.data?.user?.id ?? null;
  } catch {
    actualizadoPor = null;
  }

  const { error: deletePagosErr } = await supabase
    .from("pagos_pedido")
    .delete()
    .eq("pedido_id", id)
    .eq("tipo", "anticipo");

  if (deletePagosErr) throw deletePagosErr;

  await insertarPagosPedido(
    id,
    "anticipo",
    pagosParaAnticipo({
      anticipo: data.anticipo,
      metodo_pago: data.metodo_pago,
    }),
    actualizadoPor,
  );

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
  if (filtros.sucursalId) {
    q = q.eq("sucursal_id", filtros.sucursalId);
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

export async function liquidarSaldoConPagos(
  id: string,
  pagos: PagoDraft[],
  cobradoPorId: string | null,
): Promise<void> {
  const normalizados = normalizarPagos(pagos);
  const { error } = await supabase.rpc("registrar_pagos_saldo", {
    p_pedido_id: id,
    p_pagos: normalizados.map((pago) => ({
      metodo: pago.metodo,
      monto: pago.monto,
    })),
    p_cobrado_por: cobradoPorId,
  });

  if (error) throw error;
}

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
