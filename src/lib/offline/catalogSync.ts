import { saveCatalogo, getCatalogo, catalogoStaleMs } from "./db";
import { fetchAtributosConValores } from "@/lib/services/atributos";
import { fetchCatalogo, type Catalogo } from "@/lib/services/catalogo";
import { sincronizarClientesCache } from "@/lib/services/clientes";
import { supabase } from "@/lib/supabase/client";
import type { Atributo, AtributoValor } from "@/lib/supabase/types";

export interface RefreshCatalogResult {
  atributos: (Atributo & { valores: AtributoValor[] })[];
  catalogo: Catalogo;
}

const CATALOG_KEYS = {
  ATRIBUTOS: "atributos",
  MARCAS: "marcas",
  SUCURSALES: "sucursales",
  ENTIDADES: "entidadesEmisoras",
  CATALOGO: "catalogoProductos:v3",
  VERSION: "catalogoVersion:v1",
} as const;

const STALE_THRESHOLD_MS = 15 * 60 * 1000;

let syncEnCurso: Promise<void> | null = null;
let refreshEnCurso: Promise<RefreshCatalogResult> | null = null;

async function fetchCatalogVersion(): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("catalogo_version_actual");
    if (error) return null;
    const version = Number(data);
    return Number.isFinite(version) ? version : null;
  } catch {
    return null;
  }
}

async function guardarVersionCatalogo(version: number | null): Promise<void> {
  if (version === null) return;
  try {
    await saveCatalogo(CATALOG_KEYS.VERSION, version);
  } catch {
    // La versión es best-effort; no bloquear la venta.
  }
}

async function necesitaSincronizarCatalogo(): Promise<{
  necesita: boolean;
  version: number | null;
}> {
  const version = await fetchCatalogVersion();

  if (version === null) {
    // Sin RPC de versión: mantener el comportamiento anterior por TTL.
    return { necesita: await isCatalogStale(), version: null };
  }

  const cacheada = await getCatalogo<number>(CATALOG_KEYS.VERSION);
  return {
    necesita: cacheada === null || Number(cacheada) !== version,
    version,
  };
}

export async function syncCatalogFromServer(
  versionAntes?: number | null,
): Promise<void> {
  if (syncEnCurso) return syncEnCurso;

  const version =
    versionAntes === undefined ? await fetchCatalogVersion() : versionAntes;

  syncEnCurso = (async () => {
    let atributosOk = false;
    let catalogoOk = false;

    try {
      const atributos = await fetchAtributosConValores();
      await saveCatalogo(CATALOG_KEYS.ATRIBUTOS, atributos);
      atributosOk = true;
    } catch {
      // silencioso si falla la red
    }

    try {
      const catalogo = await fetchCatalogo();
      await saveCatalogo(CATALOG_KEYS.CATALOGO, catalogo);
      catalogoOk = true;
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

    try {
      const { data: entidades } = await supabase
        .from("entidades_emisoras")
        .select("*")
        .eq("activo", true)
        .order("orden", { ascending: true });
      if (entidades) await saveCatalogo(CATALOG_KEYS.ENTIDADES, entidades);
    } catch {
      // silencioso
    }

    await sincronizarClientesCache().catch(() => {});
    if (atributosOk && catalogoOk) {
      await guardarVersionCatalogo(version);
    }
  })();

  try {
    await syncEnCurso;
  } finally {
    syncEnCurso = null;
  }
}

export async function getCatalogFromCache() {
  const [atributos, marcas, sucursales, entidades, catalogo] =
    await Promise.all([
      getCatalogo(CATALOG_KEYS.ATRIBUTOS),
      getCatalogo(CATALOG_KEYS.MARCAS),
      getCatalogo(CATALOG_KEYS.SUCURSALES),
      getCatalogo(CATALOG_KEYS.ENTIDADES),
      getCatalogo(CATALOG_KEYS.CATALOGO),
    ]);

  return { atributos, marcas, sucursales, entidades, catalogo };
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
    const { necesita, version } = await necesitaSincronizarCatalogo();
    if (necesita) {
      await syncCatalogFromServer(version);
    }
  }
  return getCatalogFromCache();
}

export async function refreshCatalog(
  opciones: { force?: boolean } = {},
): Promise<RefreshCatalogResult> {
  const force = opciones.force ?? true;

  if (refreshEnCurso) return refreshEnCurso;

  refreshEnCurso = (async () => {
    let versionAntes: number | null;

    if (!force) {
      const { necesita, version } = await necesitaSincronizarCatalogo();
      versionAntes = version;

      if (!necesita) {
        const [atributos, catalogo] = await Promise.all([
          getCatalogo(CATALOG_KEYS.ATRIBUTOS),
          getCatalogo(CATALOG_KEYS.CATALOGO),
        ]);
        return {
          atributos: (atributos ?? []) as RefreshCatalogResult["atributos"],
          catalogo: (catalogo ?? {
            categorias: [],
            productos: [],
            descuentos: [],
          }) as Catalogo,
        };
      }
    } else {
      versionAntes = await fetchCatalogVersion();
    }

    const [atributos, catalogo] = await Promise.all([
      fetchAtributosConValores(),
      fetchCatalogo(),
    ]);
    await saveCatalogo(CATALOG_KEYS.ATRIBUTOS, atributos);
    await saveCatalogo(CATALOG_KEYS.CATALOGO, catalogo);
    await sincronizarClientesCache().catch(() => {});
    await guardarVersionCatalogo(versionAntes);
    return { atributos, catalogo };
  })();

  try {
    return await refreshEnCurso;
  } finally {
    refreshEnCurso = null;
  }
}
