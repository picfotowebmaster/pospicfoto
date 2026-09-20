export type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia";

export type EstadoPedido =
  | "pendiente"
  | "en_taller"
  | "en_corte"
  | "listo"
  | "entregado"
  | "cancelado";

export type AreaProduccion =
  | "mostrador"
  | "diseno"
  | "impresion"
  | "laminado"
  | "montaje"
  | "books"
  | "bastidores"
  | "marcos"
  | "listo"
  | "entregado";

export type RutaProduccion = "R1" | "R2" | "R3" | "R4";

export type Rol =
  | "mostrador"
  | "diseno"
  | "impresion"
  | "laminado"
  | "montaje"
  | "books"
  | "bastidores"
  | "marcos"
  | "taller"
  | "corte"
  | "admin"
  | "superadmin"
  | "contador";

export interface Atributo {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface AtributoValor {
  id: string;
  atributo_id: string;
  valor: string;
}

export interface ProductoHistorial {
  id: string;
  nombre: string;
  atributos: Record<string, string>;
  veces_usado: number;
  ultimo_uso: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface Producto {
  id: string;
  categoria_id: string;
  nombre: string;
  ruta: RutaProduccion;
  orden: number;
  activo: boolean;
}

export interface ProductoAtributo {
  id: string;
  producto_id: string;
  atributo_id: string;
  orden: number;
  requerido: boolean;
}

export interface ProductoConAtributos extends Producto {
  atributos: (Atributo & { valores: AtributoValor[] })[];
  categoria_nombre: string;
}

export interface Sucursal {
  id: string;
  nombre: string;
  codigo: string;
}

export interface Marca {
  id: string;
  nombre: string;
  codigo: string;
}

export interface Profile {
  id: string;
  rol: Rol;
  nombre: string;
  sucursal_id?: string | null;
  created_at: string;
}

export interface Pedido {
  id: string;
  cajero_id: string | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  fecha_recepcion: string;
  hora_recepcion: string;
  fecha_entrega: string;
  hora_entrega: string;
  requiere_correccion: boolean;
  estado: EstadoPedido;
  area_actual: AreaProduccion;
  ruta: RutaProduccion | null;
  area_destino: AreaProduccion | null;
  subtotal: number;
  anticipo: number;
  total: number;
  metodo_pago: MetodoPago;
  numero_pedido?: string | null;
  cliente_email?: string | null;
  factura_email_enviado?: string | null;
  factura_numero?: string | null;
  factura_uuid?: string | null;
  factura_xml_url?: string | null;
  factura_pdf_url?: string | null;
  factura_estado?: string | null;
  factura_error?: string | null;
  factura_fecha?: string | null;
  factura_cancelacion_motivo?: string | null;
  factura_cancelacion_fecha?: string | null;
  factura_cancelacion_acuse?: string | null;
  factura_serie?: string | null;
  factura_folio?: string | null;
  sucursal_id?: string | null;
  marca_id?: string | null;
  created_at: string;
  updated_at: string;
  detalle_pedidos?: DetallePedido[];
}

export interface DetallePedido {
  id: string;
  pedido_id: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  importe_linea: number;
  atributos: Record<string, string>;
  categoria_id?: string | null;
  producto_id?: string | null;
}

export interface LineaPedidoDraft {
  id: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  atributos: Record<string, string>;
  ruta: RutaProduccion;
  categoria_id?: string | null;
  producto_id?: string | null;
}

export interface PedidoDraft {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string;
  fecha_entrega: string;
  hora_entrega: string;
  requiere_correccion: boolean;
  lineas: LineaPedidoDraft[];
  subtotal: number;
  anticipo: number;
  total: number;
  metodo_pago: MetodoPago;
  ruta: RutaProduccion;
  sucursal_id: string;
  marca_id: string;
}

export interface ProductionArea {
  id: string;
  nombre: string;
  color: string;
  orden: number;
}

export interface WorkflowRoute {
  id: string;
  from_area: string;
  to_area: string;
  ruta: string;
  multiple: boolean;
}

export interface PedidoMovimiento {
  id: string;
  pedido_id: string;
  from_area: string | null;
  to_area: string;
  operador_id: string | null;
  created_at: string;
}
