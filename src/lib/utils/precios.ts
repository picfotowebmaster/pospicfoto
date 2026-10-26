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
  const regla =
    (producto.precios ?? []).find(
      (p) => p.activo && firmaValores(p.valores_ids) === firma,
    ) ?? null;

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
