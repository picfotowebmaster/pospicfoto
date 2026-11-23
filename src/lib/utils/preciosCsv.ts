import {
  dimensionDe,
  normalizarTamano,
  normalizarTexto,
} from "./importarPrecios";
import { firmaValores } from "./precios";

export interface ValorPrecioCsv {
  id: string;
  valor: string;
}

export interface AtributoPrecioCsv {
  atributo_id: string;
  nombre: string;
  valores: ValorPrecioCsv[];
}

export interface PrecioExistenteCsv {
  valores_ids: string[];
  precio: number;
}

export interface ProductoPrecioCsv {
  id: string;
  nombre: string;
  atributos_precio: AtributoPrecioCsv[];
  atributos_informativos: { nombre: string; valores: string[] }[];
  precios: PrecioExistenteCsv[];
}

export interface AtributoPrecioCatalogoCsv {
  atributo_id: string;
  nombre: string;
  valores: ValorPrecioCsv[];
}

export interface AtributoInformativoCatalogoCsv {
  atributo_id: string;
  nombre: string;
}

export interface ColorGlobalCsv {
  id: string;
  valor: string;
}

export interface ContextoPreciosCategoria {
  categoria_id: string;
  categoria_nombre: string;
  permite_crear_productos: boolean;
  atributos_precio_catalogo: AtributoPrecioCatalogoCsv[];
  atributos_informativos_catalogo: AtributoInformativoCatalogoCsv[];
  colores_globales: ColorGlobalCsv[];
  productos: ProductoPrecioCsv[];
}

export type EstadoFilaPrecioCsv = "nuevo" | "actualizado" | "sin_cambios";

export interface FilaPrecioCsv {
  fila: number;
  producto_id: string;
  producto_nombre: string;
  producto_nuevo: boolean;
  valores_ids: string[];
  etiqueta: string;
  precio_actual: number | null;
  precio_nuevo: number | null;
  estado: EstadoFilaPrecioCsv;
  colores: string[];
}

export interface ErrorPrecioCsv {
  fila: number;
  mensaje: string;
}

export interface ResumenPreciosCsv {
  total_filas: number;
  validas: number;
  nuevas: number;
  actualizadas: number;
  sin_cambios: number;
  errores: number;
  productos_nuevos: number;
  colores_nuevos: number;
  precios_nuevos: number;
}

export interface ProductoNuevoPrecioCsv {
  nombre: string;
  filas: FilaPrecioCsv[];
  colores: string[];
  colores_nuevos: string[];
  precios: { valores_ids: string[]; precio: number; etiqueta: string }[];
  precio_min: number;
  precio_max: number;
}

export interface FilasProductoPrecioCsv {
  producto_id: string;
  producto_nombre: string;
  atributos_precio: string[];
  filas: FilaPrecioCsv[];
}

export interface PrevisualizacionPreciosCsv {
  categoria: { id: string; nombre: string };
  filas: FilaPrecioCsv[];
  errores: ErrorPrecioCsv[];
  resumen: ResumenPreciosCsv;
  filas_por_producto: FilasProductoPrecioCsv[];
  productos_nuevos: ProductoNuevoPrecioCsv[];
  colores_nuevos: string[];
}

export interface PlantillaPreciosCsv {
  nombreArchivo: string;
  contenido: string;
  filas: number;
}

export interface ProductoPlanPreciosCsv {
  producto_id: string;
  producto_nombre: string;
  atributos_precio: string[];
  precios: { valores_ids: string[]; precio: number }[];
  cambios: number;
}

export interface ProductoNuevoPlanPreciosCsv {
  nombre: string;
  colores: string[];
  colores_nuevos: string[];
  precios: { valores_ids: string[]; precio: number }[];
}

export interface ProductoNuevoPayloadCsv {
  nombre: string;
  colores: string[];
  precios: { valores_ids: string[]; precio: number }[];
}

export interface PayloadCreacionProducto {
  atributos_precio: { atributo_id: string; valores_ids: string[] }[];
  colores: string[];
  precios: { valores_ids: string[]; precio: number }[];
}

export interface PlanPreciosCsv {
  productos: ProductoPlanPreciosCsv[];
  productos_nuevos: ProductoNuevoPlanPreciosCsv[];
  errores: ErrorPrecioCsv[];
}

export interface OpcionesPrevisualizacionPreciosCsv {
  crearProductosFaltantes?: boolean;
}

const CATEGORIA = "categoria";
const PRODUCTO = "producto";
const PRECIO_ACTUAL = "precio actual";
const PRECIO_NUEVO = "precio nuevo";
const PRECIO = "precio";
const COLUMNAS_IGNORADAS = new Set([
  "notas",
  "nota",
  "comentario",
  "comentarios",
  "estado",
  "error",
]);

function normalizarHeader(valor: string): string {
  return normalizarTexto(valor).replace(/\s+/g, " ").trim();
}

function normalizarSimple(valor: string): string {
  return normalizarTexto(valor).replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function slug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatearPrecio(valor: number | null): string {
  if (valor === null) return "";
  return valor.toFixed(2).replace(".", ",");
}

function escaparCelda(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

function unirFila(celdas: string[], delimitador: string): string {
  return celdas.map(escaparCelda).join(delimitador);
}

function filasATexto(filas: string[][], delimitador = ";"): string {
  return [
    `sep=${delimitador}`,
    ...filas.map((fila) => unirFila(fila, delimitador)),
  ].join("\n");
}

function mapearValor(
  atributo: AtributoPrecioCsv,
  texto: string,
): ValorPrecioCsv | null {
  const buscado = texto.trim();
  if (!buscado) return null;

  const normalizado = normalizarSimple(buscado);
  const exacto = atributo.valores.find(
    (valor) => normalizarSimple(valor.valor) === normalizado,
  );
  if (exacto) return exacto;

  const tamano = normalizarTamano(buscado);
  const exactoTamano = atributo.valores.find(
    (valor) => normalizarTamano(valor.valor) === tamano,
  );
  if (exactoTamano) return exactoTamano;

  const dimension = dimensionDe(buscado);
  if (!dimension) return null;

  const candidatos = atributo.valores.filter(
    (valor) => dimensionDe(valor.valor) === dimension,
  );
  return candidatos.length === 1 ? candidatos[0] : null;
}

export function parsearPrecioCsv(texto: string): number | null {
  let valor = texto
    .replace(/\u00a0/g, " ")
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .trim();

  if (valor === "") return null;

  const tienePunto = valor.includes(".");
  const tieneComa = valor.includes(",");

  if (tienePunto && tieneComa) {
    if (valor.lastIndexOf(",") > valor.lastIndexOf(".")) {
      valor = valor.replace(/\./g, "").replace(",", ".");
    } else {
      valor = valor.replace(/,/g, "");
    }
  } else if (tieneComa) {
    const partes = valor.split(",");
    if (partes.length === 2 && partes[1].length === 3) {
      valor = partes[0] === "0" ? `0.${partes[1]}` : partes.join("");
    } else {
      valor = valor.replace(",", ".");
    }
  } else if (tienePunto) {
    const partes = valor.split(".");
    if (partes.length === 2 && partes[1].length === 3) {
      valor = partes[0] === "0" ? `0.${partes[1]}` : partes.join("");
    } else if (partes.length > 2) {
      const decimal = partes.pop();
      valor = `${partes.join("")}.${decimal}`;
    }
  }

  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) return null;
  return Math.round(numero * 100) / 100;
}

function detectarDelimitador(linea: string): string {
  let comas = 0;
  let puntoYComas = 0;
  let comillas = false;

  for (let i = 0; i < linea.length; i++) {
    const caracter = linea[i];
    if (caracter === '"') {
      if (comillas && linea[i + 1] === '"') {
        i++;
      } else {
        comillas = !comillas;
      }
      continue;
    }
    if (comillas) continue;
    if (caracter === ",") comas++;
    if (caracter === ";") puntoYComas++;
  }

  return puntoYComas > comas ? ";" : ",";
}

export function parsearCsv(texto: string): string[][] {
  let contenido = texto.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let delimitador = detectarDelimitador(
    contenido.split("\n").find((linea) => linea.trim() !== "") ?? "",
  );

  const primeraLinea = contenido.split("\n")[0] ?? "";
  if (normalizarHeader(primeraLinea).startsWith("sep=")) {
    const separador = primeraLinea.split("=")[1]?.trim();
    if (separador === "," || separador === ";" || separador === "\t") {
      delimitador = separador;
    }
    contenido = contenido.split("\n").slice(1).join("\n");
  }

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;

  for (let i = 0; i < contenido.length; i++) {
    const caracter = contenido[i];

    if (comillas) {
      if (caracter === '"') {
        if (contenido[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          comillas = false;
        }
      } else {
        celda += caracter;
      }
      continue;
    }

    if (caracter === '"') {
      if (celda === "") {
        comillas = true;
      } else {
        celda += caracter;
      }
    } else if (caracter === delimitador) {
      fila.push(celda);
      celda = "";
    } else if (caracter === "\n") {
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else {
      celda += caracter;
    }
  }

  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }

  return filas.filter((registro) =>
    registro.some((valor) => valor.trim() !== ""),
  );
}

function combinarValores(
  atributos: AtributoPrecioCsv[],
): ValorPrecioCsv[][] {
  if (atributos.length === 0) return [[]];

  return atributos.reduce<ValorPrecioCsv[][]>(
    (acumulado, atributo) => {
      const siguiente: ValorPrecioCsv[][] = [];
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

export function construirPlantillaPreciosCsv(
  contexto: ContextoPreciosCategoria,
): PlantillaPreciosCsv {
  const atributosUnion = new Map<string, string>();
  const informativosUnion = new Map<string, string>();
  for (const producto of contexto.productos) {
    for (const atributo of producto.atributos_precio) {
      const clave = normalizarHeader(atributo.nombre);
      if (!atributosUnion.has(clave)) {
        atributosUnion.set(clave, atributo.nombre);
      }
    }
    for (const atributo of producto.atributos_informativos) {
      const clave = normalizarHeader(atributo.nombre);
      if (!informativosUnion.has(clave)) {
        informativosUnion.set(clave, atributo.nombre);
      }
    }
  }

  const nombresAtributos = [...atributosUnion.values()];
  const nombresInformativos = [...informativosUnion.values()];
  const encabezado = [
    "Categoría",
    "Producto",
    ...nombresAtributos,
    ...nombresInformativos,
    "Precio actual",
    "Precio nuevo",
  ];
  const filas: string[][] = [encabezado];

  for (const producto of contexto.productos) {
    const preciosPorFirma = new Map(
      producto.precios.map((precio) => [
        firmaValores(precio.valores_ids),
        precio.precio,
      ]),
    );
    const nombrePorValor = new Map<string, string>();
    for (const atributo of producto.atributos_precio) {
      for (const valor of atributo.valores) {
        nombrePorValor.set(valor.id, atributo.nombre);
      }
    }

    const informativosPorNombre = new Map<string, string>();
    for (const atributo of producto.atributos_informativos) {
      informativosPorNombre.set(
        normalizarHeader(atributo.nombre),
        atributo.valores.join(" | "),
      );
    }

    const combinaciones = combinarValores(producto.atributos_precio);

    for (const combinacion of combinaciones) {
      const valoresPorAtributo = new Map<string, string>();
      for (const valor of combinacion) {
        const nombre = nombrePorValor.get(valor.id);
        if (nombre) {
          valoresPorAtributo.set(normalizarHeader(nombre), valor.valor);
        }
      }

      const firma = firmaValores(combinacion.map((valor) => valor.id));
      const actual = preciosPorFirma.get(firma) ?? null;
      const celdas = [
        contexto.categoria_nombre,
        producto.nombre,
        ...nombresAtributos.map(
          (nombre) => valoresPorAtributo.get(normalizarHeader(nombre)) ?? "",
        ),
        ...nombresInformativos.map(
          (nombre) => informativosPorNombre.get(normalizarHeader(nombre)) ?? "",
        ),
        formatearPrecio(actual),
        formatearPrecio(actual),
      ];
      filas.push(celdas);
    }
  }

  return {
    nombreArchivo: `precios-${slug(contexto.categoria_nombre) || "categoria"}.csv`,
    contenido: filasATexto(filas),
    filas: filas.length - 1,
  };
}

export function construirPrevisualizacionPreciosCsv(
  contexto: ContextoPreciosCategoria,
  texto: string,
  opciones: OpcionesPrevisualizacionPreciosCsv = {},
): PrevisualizacionPreciosCsv {
  const errores: ErrorPrecioCsv[] = [];
  const filasValidas: FilaPrecioCsv[] = [];
  const filasCsv = parsearCsv(texto);
  const crearSolicitado = Boolean(opciones.crearProductosFaltantes);
  const coloresGlobalesNormalizados = new Set(
    contexto.colores_globales.map((color) => normalizarSimple(color.valor)),
  );
  const atributoColor = contexto.atributos_informativos_catalogo.find(
    (atributo) => normalizarHeader(atributo.nombre) === "color marco",
  );
  const crearFaltantes =
    crearSolicitado &&
    contexto.permite_crear_productos &&
    contexto.atributos_precio_catalogo.length > 0 &&
    Boolean(atributoColor);

  if (filasCsv.length === 0) {
    return {
      categoria: { id: contexto.categoria_id, nombre: contexto.categoria_nombre },
      filas: [],
      errores: [{ fila: 0, mensaje: "El archivo está vacío." }],
      resumen: {
        total_filas: 0,
        validas: 0,
        nuevas: 0,
        actualizadas: 0,
        sin_cambios: 0,
        errores: 1,
        productos_nuevos: 0,
        colores_nuevos: 0,
        precios_nuevos: 0,
      },
      filas_por_producto: [],
      productos_nuevos: [],
      colores_nuevos: [],
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
        mensaje: `La columna "${encabezado[i]}" está repetida.`,
      });
    } else {
      indices.set(nombre, i);
    }
  }

  const indiceProducto = indices.get(PRODUCTO);
  const indicePrecio = indices.get(PRECIO_NUEVO) ?? indices.get(PRECIO);
  const indiceCategoria = indices.get(CATEGORIA);

  if (indiceProducto === undefined) {
    errores.push({ fila: 1, mensaje: "Falta la columna Producto." });
  }
  if (indicePrecio === undefined) {
    errores.push({ fila: 1, mensaje: "Falta la columna Precio nuevo." });
  }

  const atributosCategoria = new Map<string, AtributoPrecioCsv>();
  const atributosInformativos = new Set<string>();
  for (const producto of contexto.productos) {
    for (const atributo of producto.atributos_precio) {
      atributosCategoria.set(normalizarHeader(atributo.nombre), atributo);
    }
    for (const atributo of producto.atributos_informativos) {
      atributosInformativos.add(normalizarHeader(atributo.nombre));
    }
  }
  for (const atributo of contexto.atributos_precio_catalogo) {
    atributosCategoria.set(normalizarHeader(atributo.nombre), atributo);
  }
  for (const atributo of contexto.atributos_informativos_catalogo) {
    atributosInformativos.add(normalizarHeader(atributo.nombre));
  }

  if (crearSolicitado && !crearFaltantes) {
    errores.push({
      fila: 0,
      mensaje:
        "Esta categoría no tiene la plantilla necesaria para crear productos nuevos (atributos de precio y Color marco).",
    });
  }

  for (const [nombre] of indices) {
    if (
      nombre === PRODUCTO ||
      nombre === CATEGORIA ||
      nombre === PRECIO_ACTUAL ||
      nombre === PRECIO_NUEVO ||
      nombre === PRECIO ||
      COLUMNAS_IGNORADAS.has(nombre) ||
      atributosInformativos.has(nombre)
    ) {
      continue;
    }
    if (!atributosCategoria.has(nombre)) {
      errores.push({
        fila: 1,
        mensaje: `La columna "${nombre}" no corresponde a un atributo de precio de ${contexto.categoria_nombre}.`,
      });
    }
  }

  const productosPorNombre = new Map<string, ProductoPrecioCsv>();
  for (const producto of contexto.productos) {
    const clave = normalizarHeader(producto.nombre);
    if (productosPorNombre.has(clave)) {
      errores.push({
        fila: 1,
        mensaje: `Hay productos con el mismo nombre: "${producto.nombre}".`,
      });
      continue;
    }
    productosPorNombre.set(clave, producto);
  }

  const firmasVistas = new Map<string, number>();
  const nuevosPorNombre = new Map<
    string,
    { nombre: string; filas: FilaPrecioCsv[]; colores: string[] }
  >();
  const indicePrecioActual = indices.get(PRECIO_ACTUAL);
  let totalFilas = 0;

  for (let i = 1; i < filasCsv.length; i++) {
    const celdas = filasCsv[i];
    const fila = i + 1;
    totalFilas++;

    if (celdas.every((celda) => celda.trim() === "")) continue;

    if (indiceProducto === undefined || indicePrecio === undefined) {
      continue;
    }

    const nombreProducto = (celdas[indiceProducto] ?? "").trim();
    let producto = productosPorNombre.get(normalizarHeader(nombreProducto));
    let esNuevo = false;

    if (!nombreProducto) {
      errores.push({ fila, mensaje: "La fila no tiene producto." });
      continue;
    }

    if (!producto) {
      if (!crearFaltantes) {
        errores.push({
          fila,
          mensaje: `El producto "${nombreProducto}" no existe en ${contexto.categoria_nombre}.`,
        });
        continue;
      }

      esNuevo = true;
      producto = {
        id: `nuevo:${normalizarHeader(nombreProducto)}`,
        nombre: nombreProducto,
        atributos_precio: contexto.atributos_precio_catalogo,
        atributos_informativos: [],
        precios: [],
      };
    }

    if (indiceCategoria !== undefined) {
      const categoria = (celdas[indiceCategoria] ?? "").trim();
      if (
        categoria &&
        normalizarHeader(categoria) !== normalizarHeader(contexto.categoria_nombre)
      ) {
        errores.push({
          fila,
          mensaje: `La categoría "${categoria}" no coincide con ${contexto.categoria_nombre}.`,
        });
        continue;
      }
    }

    const valoresIds: string[] = [];
    const etiquetas: string[] = [];
    let errorFila: string | null = null;

    for (const atributo of producto.atributos_precio) {
      const indice = indices.get(normalizarHeader(atributo.nombre));
      if (indice === undefined) {
        errorFila = `Falta la columna "${atributo.nombre}".`;
        break;
      }

      const textoValor = (celdas[indice] ?? "").trim();
      if (!textoValor) {
        errorFila = `La columna "${atributo.nombre}" está vacía.`;
        break;
      }

      const valor = mapearValor(atributo, textoValor);
      if (!valor) {
        errorFila = `El valor "${textoValor}" no existe para "${atributo.nombre}".`;
        break;
      }

      valoresIds.push(valor.id);
      etiquetas.push(valor.valor);
    }

    let colores: string[] = [];
    if (!errorFila && esNuevo) {
      const indiceColor =
        atributoColor === undefined
          ? undefined
          : indices.get(normalizarHeader(atributoColor.nombre));

      if (indiceColor === undefined) {
        errorFila = `Falta la columna "${atributoColor?.nombre ?? "Color marco"}".`;
      } else {
        colores = [
          ...new Set(
            (celdas[indiceColor] ?? "")
              .split("|")
              .map((color) => color.trim())
              .filter(Boolean),
          ),
        ];
        if (colores.length === 0) {
          errorFila = "La columna Color marco está vacía.";
        }
      }
    }

    if (errorFila) {
      errores.push({ fila, mensaje: errorFila });
      continue;
    }

    const textoPrecio = (celdas[indicePrecio] ?? "").trim();
    const precioNuevoTexto =
      textoPrecio === "" ? null : parsearPrecioCsv(textoPrecio);
    if (textoPrecio !== "" && precioNuevoTexto === null) {
      errores.push({
        fila,
        mensaje: `El precio "${textoPrecio}" no es válido.`,
      });
      continue;
    }

    let precioNuevo = precioNuevoTexto;
    if (esNuevo && precioNuevo === null && indicePrecioActual !== undefined) {
      const textoActual = (celdas[indicePrecioActual] ?? "").trim();
      if (textoActual !== "") {
        precioNuevo = parsearPrecioCsv(textoActual);
      }
    }
    if (esNuevo && precioNuevo === null) {
      errores.push({
        fila,
        mensaje: "El producto nuevo no tiene precio.",
      });
      continue;
    }

    const firma = firmaValores(valoresIds);
    const clave = `${producto.id}|${firma}`;
    const filaAnterior = firmasVistas.get(clave);
    if (filaAnterior !== undefined) {
      errores.push({
        fila,
        mensaje: `Variante duplicada; ya aparece en la fila ${filaAnterior}.`,
      });
      continue;
    }
    firmasVistas.set(clave, fila);

    const precioActual = esNuevo
      ? null
      : (producto.precios.find(
          (precio) => firmaValores(precio.valores_ids) === firma,
        )?.precio ?? null);

    let estado: EstadoFilaPrecioCsv = "sin_cambios";
    if (esNuevo) {
      estado = "nuevo";
    } else if (precioNuevo !== null) {
      if (precioActual === null) estado = "nuevo";
      else if (precioActual !== precioNuevo) estado = "actualizado";
    }

    const registro: FilaPrecioCsv = {
      fila,
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      producto_nuevo: esNuevo,
      valores_ids: valoresIds,
      etiqueta: etiquetas.length > 0 ? etiquetas.join(" · ") : "Precio base",
      precio_actual: precioActual,
      precio_nuevo: precioNuevo,
      estado,
      colores,
    };

    if (esNuevo) {
      const grupo = nuevosPorNombre.get(producto.id);
      if (!grupo) {
        nuevosPorNombre.set(producto.id, {
          nombre: producto.nombre,
          filas: [registro],
          colores,
        });
      } else {
        const previos = new Set(grupo.colores.map(normalizarSimple));
        const actuales = new Set(colores.map(normalizarSimple));
        const iguales =
          previos.size === actuales.size &&
          [...previos].every((color) => actuales.has(color));

        if (!iguales) {
          errores.push({
            fila,
            mensaje: `Los colores no coinciden con los de la fila ${grupo.filas[0]?.fila ?? ""} de la misma moldura.`,
          });
          continue;
        }

        grupo.filas.push(registro);
      }
    }

    filasValidas.push(registro);
  }

  const filasPorProducto = contexto.productos
    .map((producto) => {
      const filas = filasValidas.filter(
        (fila) => fila.producto_id === producto.id,
      );
      return {
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        atributos_precio: producto.atributos_precio.map(
          (atributo) => atributo.atributo_id,
        ),
        filas,
      };
    })
    .filter((producto) => producto.filas.length > 0);

  const productosNuevos: ProductoNuevoPrecioCsv[] = [];
  const coloresNuevos: string[] = [];
  const coloresNuevosVistos = new Set<string>();

  for (const grupo of nuevosPorNombre.values()) {
    if (grupo.filas.length === 0) continue;

    if (grupo.filas.some((fila) => fila.precio_nuevo === null)) {
      errores.push({
        fila: grupo.filas[0]?.fila ?? 0,
        mensaje: `La moldura nueva "${grupo.nombre}" tiene filas sin precio.`,
      });
      continue;
    }

    const coloresNuevosProducto = grupo.colores.filter(
      (color) => !coloresGlobalesNormalizados.has(normalizarSimple(color)),
    );

    for (const color of coloresNuevosProducto) {
      const clave = normalizarSimple(color);
      if (coloresNuevosVistos.has(clave)) continue;
      coloresNuevosVistos.add(clave);
      coloresNuevos.push(color);
    }

    const precios = grupo.filas.map((fila) => ({
      valores_ids: fila.valores_ids,
      precio: fila.precio_nuevo as number,
      etiqueta: fila.etiqueta,
    }));
    const importes = precios.map((precio) => precio.precio);

    productosNuevos.push({
      nombre: grupo.nombre,
      filas: grupo.filas,
      colores: grupo.colores,
      colores_nuevos: coloresNuevosProducto,
      precios,
      precio_min: Math.min(...importes),
      precio_max: Math.max(...importes),
    });
  }

  return {
    categoria: { id: contexto.categoria_id, nombre: contexto.categoria_nombre },
    filas: filasValidas,
    errores,
    resumen: {
      total_filas: totalFilas,
      validas: filasValidas.length,
      nuevas: filasValidas.filter((fila) => fila.estado === "nuevo").length,
      actualizadas: filasValidas.filter(
        (fila) => fila.estado === "actualizado",
      ).length,
      sin_cambios: filasValidas.filter(
        (fila) => fila.estado === "sin_cambios",
      ).length,
      errores: errores.length,
      productos_nuevos: productosNuevos.length,
      colores_nuevos: coloresNuevos.length,
      precios_nuevos: productosNuevos.reduce(
        (total, producto) => total + producto.filas.length,
        0,
      ),
    },
    filas_por_producto: filasPorProducto,
    productos_nuevos: productosNuevos,
    colores_nuevos: coloresNuevos,
  };
}

export function construirPlanAplicacionPreciosCsv(
  preview: PrevisualizacionPreciosCsv,
  contexto: ContextoPreciosCategoria,
): PlanPreciosCsv {
  if (preview.errores.length > 0) {
    return { productos: [], productos_nuevos: [], errores: preview.errores };
  }

  const errores: ErrorPrecioCsv[] = [];
  const productos: ProductoPlanPreciosCsv[] = [];

  for (const producto of contexto.productos) {
    const filas = preview.filas.filter(
      (fila) => fila.producto_id === producto.id,
    );
    if (filas.length === 0) continue;

    const preciosFinales = new Map(
      producto.precios.map((precio) => [
        firmaValores(precio.valores_ids),
        {
          valores_ids: precio.valores_ids,
          precio: precio.precio,
        },
      ]),
    );
    let cambios = 0;

    for (const fila of filas) {
      if (fila.precio_nuevo === null) continue;

      const firma = firmaValores(fila.valores_ids);
      const actual = preciosFinales.get(firma)?.precio ?? null;
      if (actual === fila.precio_nuevo) continue;

      preciosFinales.set(firma, {
        valores_ids: fila.valores_ids,
        precio: fila.precio_nuevo,
      });
      cambios++;
    }

    if (cambios === 0) continue;

    const atributosPrecio = producto.atributos_precio.map(
      (atributo) => atributo.atributo_id,
    );
    const precios = [...preciosFinales.values()];
    const erroresProducto: ErrorPrecioCsv[] = [];

    for (const precio of precios) {
      const atributosEnValores = new Set<number>();
      for (const valorId of precio.valores_ids) {
        const indice = producto.atributos_precio.findIndex((atributo) =>
          atributo.valores.some((valor) => valor.id === valorId),
        );
        if (indice >= 0) atributosEnValores.add(indice);
      }

      if (atributosEnValores.size !== atributosPrecio.length) {
        erroresProducto.push({
          fila: 0,
          mensaje: `La variante "${filaEtiqueta(precio.valores_ids, producto)}" no tiene un valor por atributo de precio.`,
        });
      }
    }

    if (erroresProducto.length > 0) {
      errores.push(...erroresProducto);
      continue;
    }

    productos.push({
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      atributos_precio: atributosPrecio,
      precios,
      cambios,
    });
  }

  const productosNuevos: ProductoNuevoPlanPreciosCsv[] =
    preview.productos_nuevos.map((producto) => ({
      nombre: producto.nombre,
      colores: producto.colores,
      colores_nuevos: producto.colores_nuevos,
      precios: producto.precios.map((precio) => ({
        valores_ids: precio.valores_ids,
        precio: precio.precio,
      })),
    }));

  return { productos, productos_nuevos: productosNuevos, errores };
}

export function construirPayloadCreacionProducto(
  producto: ProductoNuevoPayloadCsv,
  contexto: ContextoPreciosCategoria,
  coloresDisponibles: Map<string, string>,
): PayloadCreacionProducto {
  const atributosPrecio = contexto.atributos_precio_catalogo.map((atributo) => {
    const permitidos = new Set(atributo.valores.map((valor) => valor.id));
    const usados = new Set<string>();

    for (const precio of producto.precios) {
      for (const valorId of precio.valores_ids) {
        if (permitidos.has(valorId)) usados.add(valorId);
      }
    }

    return {
      atributo_id: atributo.atributo_id,
      valores_ids: atributo.valores
        .filter((valor) => usados.has(valor.id))
        .map((valor) => valor.id),
    };
  });

  const colores: string[] = [];
  const vistos = new Set<string>();
  for (const color of producto.colores) {
    const clave = normalizarTexto(color);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    colores.push(coloresDisponibles.get(clave) ?? color);
  }

  return {
    atributos_precio: atributosPrecio,
    colores,
    precios: producto.precios.map((precio) => ({
      valores_ids: precio.valores_ids,
      precio: precio.precio,
    })),
  };
}

function filaEtiqueta(
  valoresIds: string[],
  producto: ProductoPrecioCsv,
): string {
  const valores = producto.atributos_precio.flatMap((atributo) =>
    atributo.valores.filter((valor) => valoresIds.includes(valor.id)),
  );
  return valores.length > 0
    ? valores.map((valor) => valor.valor).join(" · ")
    : "Precio base";
}

export function construirLogPreciosCsv(
  preview: PrevisualizacionPreciosCsv,
): string {
  const filas: string[][] = [
    [
      "Fila",
      "Producto",
      "Variante",
      "Precio actual",
      "Precio nuevo",
      "Estado",
      "Error",
    ],
  ];

  for (const fila of preview.filas) {
    filas.push([
      String(fila.fila),
      fila.producto_nombre,
      fila.etiqueta,
      formatearPrecio(fila.precio_actual),
      formatearPrecio(fila.precio_nuevo),
      fila.estado === "nuevo"
        ? "Nuevo"
        : fila.estado === "actualizado"
          ? "Actualizado"
          : "Sin cambio",
      "",
    ]);
  }

  for (const error of preview.errores) {
    filas.push([
      error.fila ? String(error.fila) : "",
      "",
      "",
      "",
      "",
      "Error",
      error.mensaje,
    ]);
  }

  return filasATexto(filas);
}
