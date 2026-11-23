import { normalizarTexto } from "./importarPrecios";
import { parsearCsv } from "./preciosCsv";

export interface AtributoValorCsv {
  id: string;
  valor: string;
}

export interface AtributoValoresCsv {
  id: string;
  nombre: string;
  valores: AtributoValorCsv[];
}

export interface FilaValorCsv {
  fila: number;
  valores: string[];
}

export interface ErrorValorCsv {
  fila: number;
  mensaje: string;
}

export interface PrevisualizacionValoresCsv {
  atributo: { id: string; nombre: string };
  filas: FilaValorCsv[];
  errores: ErrorValorCsv[];
  valores_nuevos: string[];
  valores_duplicados: string[];
  payload: string[];
  resumen: {
    filas: number;
    valores_nuevos: number;
    valores_duplicados: number;
    errores: number;
  };
}

const VALOR = "valor";
const VALORES = "valores";
const ATRIBUTO = "atributo";

function normalizarHeader(valor: string): string {
  return normalizarTexto(valor).replace(/\s+/g, " ").trim();
}

export function construirPlantillaValoresCsv(): string {
  return ["sep=;", '"Valor"'].join("\n");
}

export function construirPrevisualizacionValoresCsv(
  atributo: AtributoValoresCsv,
  texto: string,
): PrevisualizacionValoresCsv {
  const errores: ErrorValorCsv[] = [];
  const filas: FilaValorCsv[] = [];
  const filasCsv = parsearCsv(texto);

  if (filasCsv.length === 0) {
    return {
      atributo: { id: atributo.id, nombre: atributo.nombre },
      filas: [],
      errores: [{ fila: 0, mensaje: "El archivo está vacío." }],
      valores_nuevos: [],
      valores_duplicados: [],
      payload: [],
      resumen: {
        filas: 0,
        valores_nuevos: 0,
        valores_duplicados: 0,
        errores: 1,
      },
    };
  }

  const encabezado = filasCsv[0].map(normalizarHeader);
  const indices = new Map<string, number>();
  for (let i = 0; i < encabezado.length; i++) {
    const nombre = encabezado[i];
    if (!nombre) continue;
    if (indices.has(nombre)) {
      errores.push({
        fila: 1,
        mensaje: `La columna "${nombre}" está repetida.`,
      });
    } else {
      indices.set(nombre, i);
    }
  }

  if (indices.has(ATRIBUTO)) {
    errores.push({
      fila: 1,
      mensaje:
        "No incluyas la columna Atributo. El atributo se selecciona en la pantalla.",
    });
  }

  if (indices.has(VALORES)) {
    errores.push({
      fila: 1,
      mensaje: "Usa solo la columna Valor; una fila por valor.",
    });
  }

  const indiceValor = indices.get(VALOR);

  if (indiceValor === undefined) {
    errores.push({ fila: 1, mensaje: "Falta la columna Valor." });
  }

  const existentes = new Map(
    atributo.valores.map((valor) => [normalizarTexto(valor.valor), valor.valor]),
  );
  const valoresEnArchivo = new Map<string, string>();
  const duplicadosArchivo: string[] = [];
  let totalFilas = 0;

  for (let i = 1; i < filasCsv.length; i++) {
    const celdas = filasCsv[i];
    const fila = i + 1;

    if (celdas.every((celda) => celda.trim() === "")) continue;
    totalFilas++;

    if (indiceValor === undefined) {
      continue;
    }

    const valor = (celdas[indiceValor] ?? "").trim();

    if (!valor) {
      errores.push({ fila, mensaje: "La fila no tiene valor." });
      continue;
    }

    const clave = normalizarTexto(valor);

    if (valoresEnArchivo.has(clave)) {
      if (!duplicadosArchivo.includes(valor)) {
        duplicadosArchivo.push(valor);
      }
    } else {
      valoresEnArchivo.set(clave, valor);
    }

    filas.push({ fila, valores: [valor] });
  }

  const valoresNuevos: string[] = [];
  const valoresDuplicados: string[] = [...duplicadosArchivo];

  for (const [clave, valor] of valoresEnArchivo) {
    if (existentes.has(clave)) {
      valoresDuplicados.push(valor);
    } else {
      valoresNuevos.push(valor);
    }
  }

  return {
    atributo: { id: atributo.id, nombre: atributo.nombre },
    filas,
    errores,
    valores_nuevos: valoresNuevos,
    valores_duplicados: valoresDuplicados,
    payload: valoresNuevos,
    resumen: {
      filas: totalFilas,
      valores_nuevos: valoresNuevos.length,
      valores_duplicados: valoresDuplicados.length,
      errores: errores.length,
    },
  };
}
