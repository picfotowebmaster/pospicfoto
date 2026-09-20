import { saveCatalogo, getCatalogo, catalogoStaleMs } from "./db";
import { fetchAtributosConValores } from "@/lib/services/atributos";
import { fetchCatalogo } from "@/lib/services/catalogo";
import { supabase } from "@/lib/supabase/client";

const CATALOG_KEYS = {
  ATRIBUTOS: "atributos",
  MARCAS: "marcas",
  SUCURSALES: "sucursales",
  CATALOGO: "catalogoProductos",
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
    const catalogo = await fetchCatalogo();
    await saveCatalogo(CATALOG_KEYS.CATALOGO, catalogo);
  } catch {
    // silencioso
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
  const [atributos, marcas, sucursales, catalogo] = await Promise.all([
    getCatalogo(CATALOG_KEYS.ATRIBUTOS),
    getCatalogo(CATALOG_KEYS.MARCAS),
    getCatalogo(CATALOG_KEYS.SUCURSALES),
    getCatalogo(CATALOG_KEYS.CATALOGO),
  ]);

  return { atributos, marcas, sucursales, catalogo };
}

export async function isCatalogStale(): Promise<boolean> {
  const stale = await catalogoStaleMs(CATALOG_KEYS.CATALOGO);
  if (stale === null) {
    const fallback = await catalogoStaleMs(CATALOG_KEYS.ATRIBUTOS);
    return fallback === null || fallback > STALE_THRESHOLD_MS;
  }
  return stale > STALE_THRESHOLD_MS;
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
