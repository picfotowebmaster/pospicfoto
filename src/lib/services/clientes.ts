import { supabase } from "../supabase/client";
import {
  catalogoStaleMs,
  getCatalogo,
  saveCatalogo,
} from "../offline/db";

const CACHE_KEY = "clientesCache:v1";
const MAX_CACHE = 500;

export interface ClienteHistorial {
  id?: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  last_order_at?: string | null;
  pedidos_count?: number;
}

export function normalizarTelefono(telefono: string): string {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("521")) return digits.slice(3);
  if (digits.length === 12 && digits.startsWith("52")) return digits.slice(2);
  return digits;
}

export function normalizarNombre(nombre: string): string {
  return (nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizarEmail(email: string): string {
  return (email ?? "").trim().toLowerCase();
}

function filaACliente(row: Record<string, unknown>): ClienteHistorial {
  return {
    id: typeof row.id === "string" ? row.id : undefined,
    nombre: String(row.nombre ?? ""),
    telefono: (row.telefono as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    last_order_at: (row.last_order_at as string | null) ?? null,
    pedidos_count:
      typeof row.pedidos_count === "number" ? row.pedidos_count : undefined,
  };
}

function claveCliente(cliente: ClienteHistorial): string {
  const telefono = normalizarTelefono(cliente.telefono ?? "");
  if (telefono) return `tel:${telefono}`;

  const email = normalizarEmail(cliente.email ?? "");
  if (email) return `email:${email}`;

  if (cliente.id) return `id:${cliente.id}`;

  return `nom:${normalizarNombre(cliente.nombre)}|${cliente.last_order_at ?? ""}`;
}

async function leerCache(): Promise<ClienteHistorial[]> {
  try {
    const cache = await getCatalogo<ClienteHistorial[]>(CACHE_KEY);
    return Array.isArray(cache) ? cache : [];
  } catch {
    return [];
  }
}

export async function guardarClientesEnCache(
  clientes: ClienteHistorial[],
): Promise<void> {
  try {
    const actuales = await leerCache();
    const mapa = new Map<string, ClienteHistorial>();
    for (const cliente of [...actuales, ...clientes]) {
      const clave = claveCliente(cliente);
      if (!clave) continue;
      const previo = mapa.get(clave);
      mapa.set(clave, {
        ...previo,
        ...cliente,
        pedidos_count:
          cliente.pedidos_count ?? previo?.pedidos_count ?? undefined,
      });
    }
    const ordenados = [...mapa.values()]
      .sort((a, b) =>
        String(b.last_order_at ?? "").localeCompare(
          String(a.last_order_at ?? ""),
        ),
      )
      .slice(0, MAX_CACHE);
    await saveCatalogo(CACHE_KEY, ordenados);
  } catch {
    // La caché es best-effort; no bloquear la venta.
  }
}

export async function sincronizarClientesCache(
  force = false,
): Promise<void> {
  try {
    const stale = await catalogoStaleMs(CACHE_KEY);
    if (!force && stale !== null && stale < 5 * 60 * 1000) return;

    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, telefono, email, last_order_at, pedidos_count")
      .order("last_order_at", { ascending: false, nullsFirst: false })
      .limit(MAX_CACHE);

    if (error) return;
    await saveCatalogo(
      CACHE_KEY,
      ((data ?? []) as Record<string, unknown>[]).map(filaACliente),
    );
  } catch {
    // La caché es best-effort.
  }
}

export async function buscarClientesLocal(
  termino: string,
): Promise<ClienteHistorial[]> {
  const qNombre = normalizarNombre(termino);
  const qTelefono = normalizarTelefono(termino);
  const qEmail = normalizarEmail(termino);
  if (!qNombre && !qTelefono && !qEmail) return [];

  const cache = await leerCache();
  const puntuados = cache
    .map((cliente) => {
      const nombre = normalizarNombre(cliente.nombre);
      const telefono = normalizarTelefono(cliente.telefono ?? "");
      const email = normalizarEmail(cliente.email ?? "");
      let score = 0;

      if (qTelefono && telefono === qTelefono) score += 6;
      else if (qTelefono && telefono.includes(qTelefono)) score += 4;

      if (qEmail && email === qEmail) score += 6;
      else if (qEmail && email.includes(qEmail)) score += 3;

      if (qNombre && nombre === qNombre) score += 6;
      else if (qNombre && nombre.includes(qNombre)) score += 2;
      if (qNombre && nombre.startsWith(qNombre)) score += 1;

      return { cliente, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(b.cliente.last_order_at ?? "").localeCompare(
          String(a.cliente.last_order_at ?? ""),
        ),
    )
    .slice(0, 8)
    .map((item) => item.cliente);

  return puntuados;
}

export async function buscarClientes(
  termino: string,
): Promise<ClienteHistorial[]> {
  const t = termino.trim();
  if (t.length < 2) return [];

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return buscarClientesLocal(t);
  }

  const { data, error } = await supabase.rpc("buscar_clientes", {
    p_q: t,
    p_limit: 8,
  });

  if (error) {
    return buscarClientesLocal(t);
  }

  const resultados = ((data ?? []) as Record<string, unknown>[]).map(
    filaACliente,
  );
  void guardarClientesEnCache(resultados);
  return resultados;
}

export async function guardarCliente(datos: {
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  pedidoId?: string | null;
  total?: number;
}): Promise<void> {
  const { data, error } = await supabase.rpc("guardar_cliente", {
    p_nombre: datos.nombre,
    p_telefono: datos.telefono || null,
    p_email: datos.email || null,
    p_pedido_id: datos.pedidoId || null,
    p_total: datos.total ?? 0,
  });

  if (error) {
    await guardarClientesEnCache([
      {
        nombre: datos.nombre,
        telefono: datos.telefono || null,
        email: datos.email || null,
        last_order_at: new Date().toISOString(),
        pedidos_count: 1,
      },
    ]);
    throw error;
  }

  const fila = Array.isArray(data) ? data[0] : data;
  if (fila) {
    await guardarClientesEnCache([
      filaACliente(fila as Record<string, unknown>),
    ]);
  }
}
