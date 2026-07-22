import { saveCatalogo, getCatalogo, catalogoStaleMs } from "./db";
import { fetchAtributosConValores } from "@/lib/services/atributos";
import { supabase } from "@/lib/supabase/client";

const CATALOG_KEYS = {
  ATRIBUTOS: "atributos",
  MARCAS: "marcas",
  SUCURSALES: "sucursales",
} as const;

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export async function syncCatalogFromServer(): Promise<void> {
  try {
    const atributos = await fetchAtributosConValores();
    await saveCatalogo(CATALOG_KEYS.ATRIBUTOS, atributos);
  } catch {
    // silencioso si falla la red
  }

  try {
    const { data: marcas } = await supabase
      .from("marcas")
      .select("id, nombre, codigo");
    if (marcas) await saveCatalogo(CATALOG_KEYS.MARCAS, marcas);
  } catch {
    // silencioso
  }

  try {
    const { data: sucursales } = await supabase
      .from("sucursales")
      .select("id, nombre, codigo");
    if (sucursales) await saveCatalogo(CATALOG_KEYS.SUCURSALES, sucursales);
  } catch {
    // silencioso
  }
}

export async function getCatalogFromCache() {
  const [atributos, marcas, sucursales] = await Promise.all([
    getCatalogo(CATALOG_KEYS.ATRIBUTOS),
    getCatalogo(CATALOG_KEYS.MARCAS),
    getCatalogo(CATALOG_KEYS.SUCURSALES),
  ]);

  return { atributos, marcas, sucursales };
}

export async function isCatalogStale(): Promise<boolean> {
  const stale = await catalogoStaleMs(CATALOG_KEYS.ATRIBUTOS);
  return stale === null || stale > STALE_THRESHOLD_MS;
}

export async function loadCatalog(isOnline: boolean) {
  if (isOnline) {
    const stale = await isCatalogStale();
    if (stale) {
      await syncCatalogFromServer();
    }
  }
  return getCatalogFromCache();
}
