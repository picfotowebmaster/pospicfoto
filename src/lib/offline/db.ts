import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "picphoto-offline";
const DB_VERSION = 1;

export interface CatalogoCache {
  key: string;
  data: unknown;
  updatedAt: number;
}

export interface PedidoEnCola {
  id: string;
  draft: Record<string, unknown>;
  createdAt: number;
  syncStatus: "pending" | "syncing" | "failed";
  errorMessage?: string;
}

export interface PedidoDraftCache {
  id: "current_draft";
  data: Record<string, unknown>;
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("catalogo")) {
          db.createObjectStore("catalogo", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("pedidosQueue")) {
          const store = db.createObjectStore("pedidosQueue", { keyPath: "id" });
          store.createIndex("syncStatus", "syncStatus");
          store.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("pedidoDraft")) {
          db.createObjectStore("pedidoDraft", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveCatalogo(key: string, data: unknown): Promise<void> {
  const db = await getDB();
  await db.put("catalogo", { key, data, updatedAt: Date.now() });
}

export async function getCatalogo<T = unknown>(key: string): Promise<T | null> {
  const db = await getDB();
  const entry = await db.get("catalogo", key);
  if (!entry) return null;
  return entry.data as T;
}

export async function hasCatalogo(key: string): Promise<boolean> {
  const entry = await getCatalogo(key);
  return entry !== null;
}

export async function catalogoStaleMs(key: string): Promise<number | null> {
  const db = await getDB();
  const entry = await db.get("catalogo", key);
  if (!entry) return null;
  return Date.now() - entry.updatedAt;
}

export async function enqueuePedido(draft: Record<string, unknown>): Promise<void> {
  const db = await getDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.put("pedidosQueue", {
    id,
    draft,
    createdAt: Date.now(),
    syncStatus: "pending",
  });
}

export async function getPendingPedidos(): Promise<PedidoEnCola[]> {
  const db = await getDB();
  return db.getAllFromIndex("pedidosQueue", "syncStatus", "pending");
}

export async function getAllQueuedPedidos(): Promise<PedidoEnCola[]> {
  const db = await getDB();
  return db.getAll("pedidosQueue");
}

export async function updatePedidoSyncStatus(
  id: string,
  syncStatus: PedidoEnCola["syncStatus"],
  errorMessage?: string,
): Promise<void> {
  const db = await getDB();
  const entry = await db.get("pedidosQueue", id);
  if (!entry) return;
  await db.put("pedidosQueue", { ...entry, syncStatus, errorMessage });
}

export async function removeSyncedPedido(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("pedidosQueue", id);
}

export async function savePedidoDraft(data: Record<string, unknown>): Promise<void> {
  const db = await getDB();
  await db.put("pedidoDraft", { id: "current_draft", data, updatedAt: Date.now() });
}

export async function getPedidoDraft(): Promise<Record<string, unknown> | null> {
  const db = await getDB();
  const entry = await db.get("pedidoDraft", "current_draft");
  if (!entry) return null;
  return entry.data;
}

export async function clearPedidoDraft(): Promise<void> {
  const db = await getDB();
  await db.delete("pedidoDraft", "current_draft");
}
