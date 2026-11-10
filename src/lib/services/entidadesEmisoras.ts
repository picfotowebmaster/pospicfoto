import { supabase } from "../supabase/client";
import type { EntidadEmisora } from "../supabase/types";
import { DATOS_EMPRESA } from "../utils/constantes";

export const EMISOR_FALLBACK: EntidadEmisora = {
  id: "",
  codigo: "PIC_CUB",
  nombre_comercial: DATOS_EMPRESA.nombre,
  razon_social: DATOS_EMPRESA.nombre,
  rfc: DATOS_EMPRESA.rfc,
  regimen_fiscal: "Régimen General Ley de Personas Morales",
  direccion: DATOS_EMPRESA.direccion,
  telefonos: DATOS_EMPRESA.telefono,
  email: DATOS_EMPRESA.correo,
  sitio_web: null,
  logo_url: "/icons/logopicfoto.svg",
  marca_id: null,
  sucursal_id: null,
  cp_expedicion: "06010",
  serie_factura: null,
  facturacion_key: "PIC",
  activo: true,
  orden: 0,
};

export async function fetchEntidadesEmisoras(): Promise<EntidadEmisora[]> {
  const { data, error } = await supabase
    .from("entidades_emisoras")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) throw error;
  return (data ?? []) as EntidadEmisora[];
}

export async function fetchEntidadEmisora(
  id: string | null | undefined,
): Promise<EntidadEmisora | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from("entidades_emisoras")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as EntidadEmisora | null) ?? null;
}

export async function fetchEntidadPorMarcaSucursal(
  marcaId: string | null | undefined,
  sucursalId: string | null | undefined,
): Promise<EntidadEmisora | null> {
  if (!marcaId || !sucursalId) return null;

  const { data, error } = await supabase
    .from("entidades_emisoras")
    .select("*")
    .eq("marca_id", marcaId)
    .eq("sucursal_id", sucursalId)
    .eq("activo", true)
    .maybeSingle();

  if (error) throw error;
  return (data as EntidadEmisora | null) ?? null;
}

export function emparejarEntidad(
  entidades: EntidadEmisora[],
  marcaId: string | null | undefined,
  sucursalId: string | null | undefined,
): EntidadEmisora | null {
  if (!marcaId || !sucursalId) return null;
  return (
    entidades.find(
      (entidad) =>
        entidad.marca_id === marcaId &&
        entidad.sucursal_id === sucursalId &&
        entidad.activo,
    ) ?? null
  );
}

export async function fetchEntidadesPorIds(
  ids: string[],
): Promise<Map<string, EntidadEmisora>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map();

  const { data, error } = await supabase
    .from("entidades_emisoras")
    .select("*")
    .in("id", unicos);

  if (error) throw error;

  const mapa = new Map<string, EntidadEmisora>();
  for (const entidad of (data ?? []) as EntidadEmisora[]) {
    mapa.set(entidad.id, entidad);
  }
  return mapa;
}

export function emisorDePedido(
  pedido: { entidad_emisora_id?: string | null },
  entidades: Map<string, EntidadEmisora>,
): EntidadEmisora {
  return (pedido.entidad_emisora_id && entidades.get(pedido.entidad_emisora_id)) || EMISOR_FALLBACK;
}
