import { supabase } from "../supabase/client";
import type { Rol } from "../supabase/types";

export interface Vendedor {
  id: string;
  nombre: string;
  email: string | null;
  rol: Rol;
  sucursal_id?: string | null;
  marca_id?: string | null;
}

const ROLES_VENDEDOR: Rol[] = ["mostrador", "admin", "superadmin"];

export async function listarVendedores(
  sucursalId?: string | null,
  marcaId?: string | null,
): Promise<Vendedor[]> {
  const filtros: { p_sucursal_id?: string; p_marca_id?: string } = {};
  if (sucursalId) filtros.p_sucursal_id = sucursalId;
  if (marcaId) filtros.p_marca_id = marcaId;

  const { data, error } = Object.keys(filtros).length
    ? await supabase.rpc("listar_vendedores", filtros)
    : await supabase.rpc("listar_vendedores");

  if (!error) {
    return (
      (data ?? []) as {
        id: string;
        nombre: string | null;
        email: string | null;
        rol: Rol;
        sucursal_id?: string | null;
        marca_id?: string | null;
      }[]
    ).map((fila) => ({
      id: fila.id,
      nombre: (fila.nombre ?? "").trim() || "Sin nombre",
      email: fila.email ?? null,
      rol: fila.rol,
      sucursal_id: fila.sucursal_id ?? null,
      marca_id: fila.marca_id ?? null,
    }));
  }

  let consulta = supabase
    .from("profiles")
    .select("id, nombre, rol, sucursal_id, marca_id");

  if (sucursalId) {
    consulta = consulta.eq("sucursal_id", sucursalId);
  }

  if (marcaId) {
    consulta = consulta.eq("marca_id", marcaId);
  }

  const { data: perfiles, error: errorPerfiles } = await consulta.order(
    "nombre",
    { ascending: true },
  );

  if (errorPerfiles) throw errorPerfiles;

  return (
    (perfiles ?? []) as {
      id: string;
      nombre: string | null;
      rol: Rol;
      sucursal_id?: string | null;
      marca_id?: string | null;
    }[]
  ).map((fila) => ({
    id: fila.id,
    nombre: (fila.nombre ?? "").trim() || "Sin nombre",
    email: null,
    rol: fila.rol,
    sucursal_id: fila.sucursal_id ?? null,
    marca_id: fila.marca_id ?? null,
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
