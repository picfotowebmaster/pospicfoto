import type { Rol } from "@/lib/supabase/types";

export const ROLE_LABELS: Record<string, string> = {
  mostrador: "Mostrador",
  diseno: "Diseño",
  impresion: "Impresión",
  laminado: "Laminado",
  montaje: "Montaje",
  books: "Books",
  bastidores: "Bastidores",
  marcos: "Marcos",
  taller: "Taller",
  corte: "Corte",
  contador: "Contador",
  admin: "Admin",
  superadmin: "Superadmin",
};

export const ROLES_PRODUCCION_SWITCH = [
  "diseno",
  "impresion",
  "laminado",
  "montaje",
  "books",
  "bastidores",
  "marcos",
  "corte",
] as const;

export const ROLES_SWITCH_ADMIN = [
  "mostrador",
  ...ROLES_PRODUCCION_SWITCH,
  "taller",
  "contador",
] as const;

export const ROLE_DESTINO: Record<string, string> = {
  mostrador: "/mostrador",
  diseno: "/produccion/kanban",
  impresion: "/produccion/kanban",
  laminado: "/produccion/kanban",
  montaje: "/produccion/kanban",
  books: "/produccion/kanban",
  bastidores: "/produccion/kanban",
  marcos: "/produccion/kanban",
  taller: "/produccion/kanban",
  corte: "/produccion/kanban",
  contador: "/contabilidad",
};

export function esAdminRol(rol: string | null | undefined): boolean {
  return rol === "admin" || rol === "superadmin";
}

export function puedeVerRoleSwitcher(rol: string | null | undefined): boolean {
  return esAdminRol(rol) || rol === "taller";
}

export function rolesSwitchDisponibles(
  rol: string | null | undefined,
): string[] {
  if (esAdminRol(rol)) return [...ROLES_SWITCH_ADMIN];
  if (rol === "taller") return [...ROLES_PRODUCCION_SWITCH];
  return [];
}

export function resolverRolEfectivo(
  rolReal: Rol | string | null | undefined,
  override: string | null | undefined,
): string | null {
  if (!rolReal) return null;
  if (!override) return rolReal;
  const permitidos = rolesSwitchDisponibles(rolReal);
  return permitidos.includes(override) ? override : rolReal;
}

export function etiquetaVolver(
  rolReal: string | null | undefined,
): string {
  return rolReal === "taller" ? "Volver a Taller" : "Volver a Admin";
}

export function getRoleOverrideCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)role_override=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
