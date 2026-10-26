import type { AtributoValor } from "@/lib/supabase/types";
import { firmaValores, generarCombinaciones } from "./precios";

export interface ValorCatalogo {
  id: string;
  valor: string;
}

export interface AtributoCatalogoPrecio {
  atributo_id: string;
  nombre: string;
  afecta_precio: boolean;
  valores: ValorCatalogo[];
}

export interface ProductoCatalogoPrecio {
  id: string;
  nombre: string;
  atributos: AtributoCatalogoPrecio[];
}

export interface VariacionWeb {
  id: number;
  precio: number;
  atributos: Record<string, string>;
}

export interface PrecioExistente {
  valores_ids: string[];
  precio: number;
}

export interface FilaPrecioImportada {
  valores_ids: string[];
  precio: number;
  etiqueta: string;
}

export type EstadoPrecioImportado =
  | "nuevo"
  | "actualizado"
  | "sin_cambios";

export interface FilaImportadaDetalle extends FilaPrecioImportada {
  estado: EstadoPrecioImportado;
}

export interface ConflictoPrecio {
  etiqueta: string;
  valores_ids: string[];
  precios: number[];
  variaciones: number[];
}

export interface FaltantePrecio {
  etiqueta: string;
  valores_ids: string[];
}

export interface DetalleImportacion {
  variacion_id: number;
  atributo?: string;
  valor?: string;
  motivo: string;
}

export interface ResumenImportacion {
  total_variaciones: number;
  precios_importados: number;
  precios_existentes: number;
  precios_a_guardar: number;
  nuevos: number;
  actualizados: number;
  sin_cambios: number;
}

export interface ResultadoImportacion {
  producto: { id: string; nombre: string };
  atributos_precio: string[];
  filas: FilaPrecioImportada[];
  detalle: FilaImportadaDetalle[];
  conflictos: ConflictoPrecio[];
  faltantes: FaltantePrecio[];
  incompletos: DetalleImportacion[];
  sin_mapear: DetalleImportacion[];
  resumen: ResumenImportacion;
}

const WEB_KEYS: Record<string, string> = {
  "book tamano": "attribute_pa_tamanos-book",
  "mini book tamano": "attribute_pa_tamanos-mini-books",
  "impresion tamano": "attribute_pa_tamano-de-impresion",
  "ancho de rollo": "attribute_pa_ancho-de-rollo",
  "largo de rollo": "attribute_pa_largo-de-rollo",
  "tamano easy sheet": "attribute_pa_tamano-easy-sheet",
  "caja tamano": "attribute_pa_tamano-de-caja",
  "hojas y paginas": "attribute_pa_hojas-y-paginas",
  "hoja extra": "attribute_pa_hoja-extra",
  "requiero diseno": "attribute_pa_requiero-diseno",
};

function decodificarEntidades(valor: string): string {
  return valor
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

export function normalizarTexto(valor: string): string {
  return decodificarEntidades(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[×✕]/g, "x")
    .replace(/[″”„“"]/g, "")
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES_TAMANO: Record<string, string> = {
  "14x11-2": "14x11",
};

function normalizarTamano(valor: string): string {
  let s = normalizarTexto(valor);
  s = ALIASES_TAMANO[s] ?? s;
  s = s.replace(/(\d)-(\d)(?!\d)/g, "$1.$2");
  s = s.replace(/-/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

function dimensionDe(valor: string): string | null {
  const match = normalizarTamano(valor).match(
    /(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/,
  );
  return match ? `${match[1]}x${match[2]}` : null;
}

function normalizarNoTamano(valor: string): string {
  return normalizarTexto(valor).replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

const ALIASES_VALOR: Record<string, string> = {
  "2536m": "25x36m",
};

function mapearValor(
  atributo: AtributoCatalogoPrecio,
  valorWeb: string,
): ValorCatalogo | null {
  const valorNormalizado = normalizarTexto(valorWeb);
  const valorBuscado = ALIASES_VALOR[valorNormalizado] ?? valorWeb;

  const normalizado = normalizarNoTamano(valorBuscado);
  const exacto = atributo.valores.find(
    (v) => normalizarNoTamano(v.valor) === normalizado,
  );
  if (exacto) return exacto;

  const tamanoWeb = normalizarTamano(valorBuscado);
  const exactoTamano = atributo.valores.find(
    (v) => normalizarTamano(v.valor) === tamanoWeb,
  );
  if (exactoTamano) return exactoTamano;

  const dimension = dimensionDe(valorBuscado);
  if (!dimension) return null;
  const candidatos = atributo.valores.filter(
    (v) => dimensionDe(v.valor) === dimension,
  );
  return candidatos.length === 1 ? candidatos[0] : null;
}

function webKeyPara(atributo: AtributoCatalogoPrecio): string | null {
  return WEB_KEYS[normalizarTexto(atributo.nombre)] ?? null;
}

interface EntradaMapeada {
  variacion_id: number;
  valores_ids: string[];
  precio: number;
  etiqueta: string;
  diseno_vacio: boolean;
}

export function generarImportacionProducto(
  producto: ProductoCatalogoPrecio,
  variaciones: VariacionWeb[],
  preciosExistentes: PrecioExistente[],
  opciones: { reemplazar?: boolean } = {},
): ResultadoImportacion {
  const atributosPrecio = producto.atributos.filter((a) => a.afecta_precio);

  const clavesWeb = new Map<string, string>();
  for (const atributo of atributosPrecio) {
    const clave = webKeyPara(atributo);
    if (!clave) {
      throw new Error(
        `No sé cómo importar el atributo "${atributo.nombre}" de "${producto.nombre}"`,
      );
    }
    clavesWeb.set(atributo.atributo_id, clave);
  }

  const incompletos: DetalleImportacion[] = [];
  const sinMapear: DetalleImportacion[] = [];
  const entradas: EntradaMapeada[] = [];

  for (const variacion of variaciones) {
    const valores: ValorCatalogo[] = [];
    let incompleta = false;
    let disenoVacio = false;

    for (const atributo of atributosPrecio) {
      const clave = clavesWeb.get(atributo.atributo_id)!;
      const valorWeb = variacion.atributos[clave] ?? "";
      const esDiseno = normalizarTexto(atributo.nombre) === "requiero diseno";

      if (!valorWeb) {
        if (esDiseno) {
          const no = atributo.valores.find(
            (v) => normalizarTexto(v.valor) === "no",
          );
          if (!no) {
            incompletos.push({
              variacion_id: variacion.id,
              atributo: atributo.nombre,
              motivo: "Sin valor y el catálogo no tiene 'No'",
            });
            incompleta = true;
            break;
          }
          valores.push(no);
          disenoVacio = true;
          continue;
        }

        incompletos.push({
          variacion_id: variacion.id,
          atributo: atributo.nombre,
          motivo: "Variación sin valor",
        });
        incompleta = true;
        break;
      }

      const mapeado = mapearValor(atributo, valorWeb);
      if (!mapeado) {
        sinMapear.push({
          variacion_id: variacion.id,
          atributo: atributo.nombre,
          valor: valorWeb,
          motivo: "Valor no encontrado en el catálogo",
        });
        incompleta = true;
        break;
      }
      valores.push(mapeado);
    }

    if (incompleta) continue;

    entradas.push({
      variacion_id: variacion.id,
      valores_ids: valores.map((v) => v.id),
      precio: variacion.precio,
      etiqueta:
        valores.length > 0
          ? valores.map((v) => v.valor).join(" · ")
          : "Precio base",
      diseno_vacio: disenoVacio,
    });
  }

  const grupos = new Map<string, EntradaMapeada[]>();
  for (const entrada of entradas) {
    const firma = firmaValores(entrada.valores_ids);
    const lista = grupos.get(firma) ?? [];
    lista.push(entrada);
    grupos.set(firma, lista);
  }

  const filasImportadas: FilaPrecioImportada[] = [];
  const conflictos: ConflictoPrecio[] = [];

  for (const grupo of grupos.values()) {
    const explicitos = grupo.filter((e) => !e.diseno_vacio);
    const candidatos = explicitos.length > 0 ? explicitos : grupo;
    const precios = [...new Set(candidatos.map((e) => e.precio))];

    if (precios.length > 1) {
      const referencia = candidatos[0];
      conflictos.push({
        etiqueta: referencia.etiqueta,
        valores_ids: [...referencia.valores_ids],
        precios: [...precios].sort((a, b) => a - b),
        variaciones: candidatos.map((e) => e.variacion_id),
      });
      continue;
    }

    const elegida = candidatos[0];
    if (!elegida) continue;
    filasImportadas.push({
      valores_ids: [...elegida.valores_ids],
      precio: precios[0],
      etiqueta: elegida.etiqueta,
    });
  }

  const conflictosPorFirma = new Set(
    conflictos.map((c) => firmaValores(c.valores_ids)),
  );
  const importadasPorFirma = new Map(
    filasImportadas.map((f) => [firmaValores(f.valores_ids), f]),
  );
  const existentesPorFirma = new Map(
    preciosExistentes.map((p) => [firmaValores(p.valores_ids), p]),
  );
  const reemplazar = opciones.reemplazar ?? false;

  const combinacionesEsperadas = generarCombinaciones(
    atributosPrecio.map((a) => ({
      nombre: a.nombre,
      valores: a.valores.map(
        (v) =>
          ({
            id: v.id,
            atributo_id: a.atributo_id,
            valor: v.valor,
          }) as AtributoValor,
      ),
    })),
  );

  const faltantes: FaltantePrecio[] = [];
  for (const combinacion of combinacionesEsperadas) {
    const ids = combinacion.map((v) => v.id);
    const firma = firmaValores(ids);
    if (importadasPorFirma.has(firma) || conflictosPorFirma.has(firma)) {
      continue;
    }
    if (!reemplazar && existentesPorFirma.has(firma)) {
      continue;
    }
    faltantes.push({
      valores_ids: ids,
      etiqueta: combinacion.map((v) => v.valor).join(" · "),
    });
  }

  const preciosFinales = new Map<string, FilaPrecioImportada>();

  if (!reemplazar) {
    for (const existente of preciosExistentes) {
      preciosFinales.set(firmaValores(existente.valores_ids), {
        valores_ids: existente.valores_ids,
        precio: existente.precio,
        etiqueta: "",
      });
    }
  }

  let nuevos = 0;
  let actualizados = 0;
  let sinCambios = 0;
  const detalle: FilaImportadaDetalle[] = [];
  for (const fila of filasImportadas) {
    const firma = firmaValores(fila.valores_ids);
    const existente = existentesPorFirma.get(firma);
    let estado: FilaImportadaDetalle["estado"];
    if (!existente) {
      nuevos++;
      estado = "nuevo";
    } else if (existente.precio !== fila.precio) {
      actualizados++;
      estado = "actualizado";
    } else {
      sinCambios++;
      estado = "sin_cambios";
    }
    detalle.push({ ...fila, estado });
    preciosFinales.set(firma, fila);
  }

  const filas = [...preciosFinales.values()];

  return {
    producto: { id: producto.id, nombre: producto.nombre },
    atributos_precio: atributosPrecio.map((a) => a.atributo_id),
    filas,
    detalle,
    conflictos,
    faltantes,
    incompletos,
    sin_mapear: sinMapear,
    resumen: {
      total_variaciones: variaciones.length,
      precios_importados: filasImportadas.length,
      precios_existentes: preciosExistentes.length,
      precios_a_guardar: filas.length,
      nuevos,
      actualizados,
      sin_cambios: sinCambios,
    },
  };
}

export interface LogImportacion {
  producto: string;
  detalle: FilaImportadaDetalle[];
  conflictos: ConflictoPrecio[];
  faltantes: FaltantePrecio[];
  incompletos: DetalleImportacion[];
  sin_mapear: DetalleImportacion[];
}

const ESTADO_CSV: Record<string, string> = {
  nuevo: "Nuevo",
  actualizado: "Actualizado",
  sin_cambios: "Sin cambios",
  conflicto: "Conflicto",
  faltante: "Faltante",
  incompleto: "Incompleto",
  sin_mapear: "Sin mapear",
};

function escaparCsv(valor: string | number): string {
  return `"${String(valor).replace(/"/g, '""')}"`;
}

function filasCsv(log: LogImportacion): (string | number)[][] {
  const filas: (string | number)[][] = [];

  for (const fila of log.detalle) {
    filas.push([
      log.producto,
      fila.etiqueta,
      fila.precio.toFixed(2),
      ESTADO_CSV[fila.estado] ?? fila.estado,
      "",
    ]);
  }
  for (const conflicto of log.conflictos) {
    filas.push([
      log.producto,
      conflicto.etiqueta,
      conflicto.precios.map((p) => p.toFixed(2)).join(" | "),
      ESTADO_CSV.conflicto,
      `Variaciones ${conflicto.variaciones.join(", ")}`,
    ]);
  }
  for (const faltante of log.faltantes) {
    filas.push([
      log.producto,
      faltante.etiqueta,
      "",
      ESTADO_CSV.faltante,
      "Sin precio en la tienda",
    ]);
  }
  for (const detalle of log.incompletos) {
    filas.push([
      log.producto,
      "",
      "",
      ESTADO_CSV.incompleto,
      `#${detalle.variacion_id}: ${detalle.motivo}${
        detalle.atributo ? ` (${detalle.atributo})` : ""
      }`,
    ]);
  }
  for (const detalle of log.sin_mapear) {
    filas.push([
      log.producto,
      "",
      "",
      ESTADO_CSV.sin_mapear,
      `#${detalle.variacion_id}: ${detalle.motivo}${
        detalle.valor ? ` - ${detalle.valor}` : ""
      }`,
    ]);
  }

  return filas;
}

export function construirCsvImportacion(log: LogImportacion): string {
  return construirCsvImportaciones([log]);
}

export function construirCsvImportaciones(logs: LogImportacion[]): string {
  const filas = [
    ["Producto", "Variante", "Precio", "Estado", "Detalle"],
    ...logs.flatMap(filasCsv),
  ];
  return (
    "\ufeff" +
    filas.map((fila) => fila.map(escaparCsv).join(",")).join("\n")
  );
}
