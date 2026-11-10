import type {
  AtributoValor,
  ProductoConAtributos,
  ProductoPrecio,
} from "@/lib/supabase/types";

export interface PrecioResuelto {
  precio: number | null;
  completo: boolean;
  regla: ProductoPrecio | null;
}

export function esTablaPreciosFaltante(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: string; message?: string };
  return (
    code === "PGRST205" ||
    Boolean(message?.includes("producto_precios")) ||
    Boolean(message?.includes("producto_precios_historial"))
  );
}

export function normalizarValoresIds(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

export function firmaValores(ids: string[]): string {
  return normalizarValoresIds(ids).join("|");
}

export function inferirNombresAtributosPrecio(
  producto: Pick<ProductoConAtributos, "atributos" | "precios">,
): string[] {
  const marcados = (producto.atributos ?? [])
    .filter((a) => a.afecta_precio)
    .map((a) => a.nombre);

  if (marcados.length > 0 || !producto.precios || producto.precios.length === 0) {
    return marcados;
  }

  const nombrePorValor = new Map<string, string>();
  for (const atributo of producto.atributos ?? []) {
    for (const valor of atributo.valores ?? []) {
      nombrePorValor.set(valor.id, atributo.nombre);
    }
  }

  const inferidos = new Set<string>();
  for (const precio of producto.precios) {
    for (const valorId of precio.valores_ids ?? []) {
      const nombre = nombrePorValor.get(valorId);
      if (nombre) inferidos.add(nombre);
    }
  }

  return [...inferidos];
}

export function resolverPrecio(
  producto: Pick<ProductoConAtributos, "atributos" | "precios">,
  atributos: Record<string, string>,
): PrecioResuelto {
  const nombresPrecio = new Set(inferirNombresAtributosPrecio(producto));
  const atributosPrecio = (producto.atributos ?? []).filter((a) =>
    nombresPrecio.has(a.nombre),
  );
  const valoresSeleccionados: string[] = [];

  for (const atributo of atributosPrecio) {
    const valor = atributo.valores.find(
      (v) => v.valor === atributos[atributo.nombre],
    );
    if (!valor) {
      return { precio: null, completo: false, regla: null };
    }
    valoresSeleccionados.push(valor.id);
  }

  const firma = firmaValores(valoresSeleccionados);
  const preciosActivos = (producto.precios ?? []).filter((p) => p.activo);
  const regla =
    preciosActivos.find((p) => firmaValores(p.valores_ids) === firma) ?? null;

  return {
    precio: regla?.precio ?? null,
    completo: true,
    regla,
  };
}

export function generarCombinaciones(
  atributos: { nombre: string; valores: AtributoValor[] }[],
): AtributoValor[][] {
  if (atributos.length === 0) return [[]];

  return atributos.reduce<AtributoValor[][]>(
    (acumulado, atributo) => {
      const siguiente: AtributoValor[][] = [];
      for (const combinacion of acumulado) {
        for (const valor of atributo.valores) {
          siguiente.push([...combinacion, valor]);
        }
      }
      return siguiente;
    },
    [[]],
  );
}

function valoresDistintos(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let distintos = 0;
  for (const id of setA) if (!setB.has(id)) distintos++;
  for (const id of setB) if (!setA.has(id)) distintos++;
  return distintos;
}

function esPrecioValido(precio: string): boolean {
  if (precio.trim() === "") return false;
  const valor = Number(precio);
  return Number.isFinite(valor) && valor >= 0;
}

export interface ResultadoCompletarPrecios<T> {
  filas: T[];
  completadas: number;
  sinReferencia: number;
}

export function completarPreciosFaltantes<
  T extends { valores_ids: string[]; precio: string },
>(filas: T[]): ResultadoCompletarPrecios<T> {
  const referencias = filas.filter((fila) => esPrecioValido(fila.precio));
  if (referencias.length === 0) {
    return {
      filas,
      completadas: 0,
      sinReferencia: filas.filter((fila) => !esPrecioValido(fila.precio)).length,
    };
  }

  let completadas = 0;
  let sinReferencia = 0;

  const nuevas = filas.map((fila) => {
    if (esPrecioValido(fila.precio)) return fila;

    let mejorDistancia = Infinity;
    let candidatos: T[] = [];
    for (const referencia of referencias) {
      const distancia = valoresDistintos(
        fila.valores_ids,
        referencia.valores_ids,
      );
      if (distancia < mejorDistancia) {
        mejorDistancia = distancia;
        candidatos = [referencia];
      } else if (distancia === mejorDistancia) {
        candidatos.push(referencia);
      }
    }

    if (candidatos.length === 0) {
      sinReferencia++;
      return fila;
    }

    const precio = Math.min(...candidatos.map((c) => Number(c.precio)));
    completadas++;
    return { ...fila, precio: precio.toFixed(2) } as T;
  });

  return { filas: nuevas, completadas, sinReferencia };
}
