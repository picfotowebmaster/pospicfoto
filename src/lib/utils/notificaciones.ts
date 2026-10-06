import { AREAS_PRODUCCION_DATA } from "./constantes";
import type { Pedido } from "@/lib/supabase/types";

export type TipoNotificacion =
  | "nuevo"
  | "correccion"
  | "prioridad"
  | "asignado"
  | "saldo";

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string;
  area: string | null;
  pedidoId: string;
  fecha: string;
  leida: boolean;
}

export const TIPOS_NOTIFICACION: {
  value: TipoNotificacion;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: "nuevo", label: "Nuevos", icon: "fa-plus-circle", color: "text-blue-500" },
  { value: "correccion", label: "Correcciones", icon: "fa-triangle-exclamation", color: "text-orange-500" },
  { value: "prioridad", label: "Prioritarios", icon: "fa-flag", color: "text-red-500" },
  { value: "asignado", label: "Asignados", icon: "fa-user-plus", color: "text-purple-500" },
  { value: "saldo", label: "Cobros", icon: "fa-hand-holding-dollar", color: "text-emerald-500" },
];

export const ICONO_TIPO: Record<TipoNotificacion, string> = {
  nuevo: "fa-plus-circle",
  correccion: "fa-triangle-exclamation",
  prioridad: "fa-flag",
  asignado: "fa-user-plus",
  saldo: "fa-hand-holding-dollar",
};

export function nombreArea(id?: string | null): string {
  if (!id) return "—";
  return AREAS_PRODUCCION_DATA.find((a) => a.id === id)?.nombre || id;
}

export interface RealtimePayload {
  eventType?: string;
  new?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
}

export function derivarNotificacion(
  payload: RealtimePayload,
  ahora: number = Date.now(),
): Notificacion | null {
  const nuevo = payload.new as (Partial<Pedido> & { id?: string }) | null;
  const anterior = payload.old as Partial<Pedido> | null;

  if (!nuevo?.id) return null;

  const base = {
    id: `${nuevo.id}-${ahora}`,
    pedidoId: nuevo.id,
    fecha: new Date(ahora).toISOString(),
    leida: false,
  };

  if (payload.eventType === "INSERT") {
    return {
      ...base,
      tipo: "nuevo",
      titulo: `Nuevo pedido: ${nuevo.cliente_nombre ?? ""}`,
      detalle: `Entró a ${nombreArea(nuevo.area_actual)}`,
      area: nuevo.area_actual ?? null,
    };
  }

  if (payload.eventType === "UPDATE") {
    if (nuevo.requiere_correccion && !anterior?.requiere_correccion) {
      return {
        ...base,
        tipo: "correccion",
        titulo: `Corrección: ${nuevo.cliente_nombre ?? ""}`,
        detalle: nuevo.motivo_correccion || "Se solicitó una corrección",
        area: nuevo.area_actual ?? null,
      };
    }
    if (nuevo.prioridad === "urgente" && anterior?.prioridad !== "urgente") {
      return {
        ...base,
        tipo: "prioridad",
        titulo: `Marcado prioritario: ${nuevo.cliente_nombre ?? ""}`,
        detalle: `En ${nombreArea(nuevo.area_actual)}`,
        area: nuevo.area_actual ?? null,
      };
    }
    if (nuevo.saldo_cobrado && !anterior?.saldo_cobrado) {
      const saldo = (nuevo.total ?? 0) - (nuevo.anticipo ?? 0);
      return {
        ...base,
        tipo: "saldo",
        titulo: `Saldo cobrado: ${nuevo.cliente_nombre ?? ""}`,
        detalle: `$${saldo.toFixed(2)} (${nuevo.saldo_metodo_pago ?? "—"})`,
        area: nuevo.area_actual ?? null,
      };
    }
    if (nuevo.asignado_a && nuevo.asignado_a !== anterior?.asignado_a) {
      return {
        ...base,
        tipo: "asignado",
        titulo: `Pedido asignado: ${nuevo.cliente_nombre ?? ""}`,
        detalle: `En ${nombreArea(nuevo.area_actual)}`,
        area: nuevo.area_actual ?? null,
      };
    }
  }

  return null;
}
