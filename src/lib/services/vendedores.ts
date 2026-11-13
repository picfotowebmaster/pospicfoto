import { supabase } from "../supabase/client";
import type { Rol } from "../supabase/types";

export interface Vendedor {
  id: string;
  nombre: string;
  email: string | null;
  rol: Rol;
}

const ROLES_VENDEDOR: Rol[] = ["mostrador", "admin", "superadmin"];

export async function listarVendedores(): Promise<Vendedor[]> {
  const { data, error } = await supabase.rpc("listar_vendedores");

  if (!error) {
    return (
      (data ?? []) as {
        id: string;
        nombre: string | null;
        email: string | null;
        rol: Rol;
      }[]
    ).map((fila) => ({
      id: fila.id,
      nombre: (fila.nombre ?? "").trim() || "Sin nombre",
      email: fila.email ?? null,
      rol: fila.rol,
    }));
  }

  const { data: perfiles, error: errorPerfiles } = await supabase
    .from("profiles")
    .select("id, nombre, rol")
    .order("nombre", { ascending: true });

  if (errorPerfiles) throw errorPerfiles;

  return (
    (perfiles ?? []) as { id: string; nombre: string | null; rol: Rol }[]
  ).map((fila) => ({
    id: fila.id,
    nombre: (fila.nombre ?? "").trim() || "Sin nombre",
    email: null,
    rol: fila.rol,
  }));
}

export function etiquetaVendedor(vendedor: Vendedor): string {
  return vendedor.email
    ? `${vendedor.nombre} (${vendedor.email})`
    : vendedor.nombre;
}

export function vendedoresParaFiltro(vendedores: Vendedor[]): Vendedor[] {
  return vendedores.filter((vendedor) =>
    ROLES_VENDEDOR.includes(vendedor.rol),
  );
}

export function indexarVendedores(
  vendedores: Vendedor[],
): Map<string, string> {
  return new Map(
    vendedores.map((vendedor) => [
      vendedor.id,
      etiquetaVendedor(vendedor),
    ]),
  );
}

export function nombreVendedor(
  id: string | null | undefined,
  nombres: Map<string, string>,
): string {
  if (!id) return "Sin vendedor";
  return nombres.get(id) ?? "Sin vendedor";
}
