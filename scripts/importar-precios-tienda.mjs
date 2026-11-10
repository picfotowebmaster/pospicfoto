#!/usr/bin/env node
/*
 * Importa precios desde la tienda WooCommerce (Store API) al catálogo del POS.
 *
 * Replica la lógica de src/lib/services/importarPreciosWeb.ts:
 *  - Mapea productos y variaciones de la tienda contra el catálogo local.
 *  - Conserva los precios existentes (equivalente a reemplazar=false).
 *  - Omite conflictos (misma variante con distinto precio) e incompletos.
 *  - Llama al RPC guardar_precios_producto por producto.
 *
 * Uso:
 *   node scripts/importar-precios-tienda.mjs                 # simulación
 *   node scripts/importar-precios-tienda.mjs --apply         # escribe en Supabase
 *   node scripts/importar-precios-tienda.mjs --category="Mini Books"
 *   node scripts/importar-precios-tienda.mjs --apply --category="Photo Books"
 */

import fs from "node:fs";
import path from "node:path";

const STORE_URL = "https://picfoto.mx/wp-json/wc/store";

const CATEGORIAS_WEB = {
  "photo books": "photobooks",
  "mini books": "mini-books",
  acrilicos: "acrilicos",
  adhesivos: "adhesivos",
  "estuches y cajas": "estuches-y-cajas",
  "impresion en canvas": "impresion-en-canvas",
  impresiones: "impresiones",
  "ink jet / papeles y materiales": "ink-jet",
  "rollos de laminado fotografico": "laminados-fotograficos",
  marcos: "marcos",
};

const WEB_KEYS = {
  "book tamano": "attribute_pa_tamanos-book",
  "mini book tamano": "attribute_pa_tamanos-mini-books",
  "impresion tamano": "attribute_pa_tamano-de-impresion",
  "ancho de rollo": "attribute_pa_ancho-de-rollo",
  "largo de rollo": "attribute_pa_largo-de-rollo",
  "tamano easy sheet": "attribute_pa_tamano-easy-sheet",
  "caja tamano": "attribute_pa_tamano-de-caja",
  papel: "attribute_pa_papel",
  "tipo de impresion": "attribute_pa_tipo-de-impresion",
  "papel tamano": "attribute_pa_papel-tamano",
  "cantidad de hojas": "attribute_pa_cantidad-de-hojas",
  "tipo de papel ink jet": "attribute_pa_tipo-de-papel-ink-jet",
  "tamano de marco": "attribute_pa_tamano-de-marco",
  grosor: "attribute_pa_grosor",
  textura: "attribute_pa_textura",
  "hojas y paginas": "attribute_pa_hojas-y-paginas",
  "hoja extra": "attribute_pa_hoja-extra",
  "requiero diseno": "attribute_pa_requiero-diseno",
};

const WEB_KEYS_POR_PRODUCTO = {
  "rollo de laminado cristal": {
    "ancho de rollo": "attribute_pa_rollo-de-laminado-cristal",
  },
};

const ALIASES_PRODUCTO = {
  "porta retrato de acrilico con chapetones":
    "portarretrato de acrilico con chapetones",
  "estuche vinipiel para dvd/usb": "estuche para usb y dvd",
  "papel ink mate": "papel ink jet fine art mate",
  "papel inkjet mate": "papel ink jet fine art mate",
};

const ALIASES_VALOR = {
  "2536m": "25x36m",
  "satin-lustre": "Satin/Lustre",
};

const ALIASES_TAMANO = {
  "14x11-2": "14x11",
};

function decodificarEntidades(valor) {
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

function decodificarPorcentaje(valor) {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

function normalizarTexto(valor) {
  return decodificarEntidades(decodificarPorcentaje(valor))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[×✕]/g, "x")
    .replace(/[″”„“"]/g, "")
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarTamano(valor) {
  let s = normalizarTexto(valor);
  s = ALIASES_TAMANO[s] ?? s;
  s = s.replace(/(\d)-(\d)(?!\d)/g, "$1.$2");
  s = s.replace(/-/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

function dimensionDe(valor) {
  const match = normalizarTamano(valor).match(
    /(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/,
  );
  return match ? `${match[1]}x${match[2]}` : null;
}

function normalizarNoTamano(valor) {
  return normalizarTexto(valor).replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function mapearValor(atributo, valorWeb) {
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

function nombresEquivalentes(a, b) {
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);
  const aliasA = ALIASES_PRODUCTO[na] ?? na;
  const aliasB = ALIASES_PRODUCTO[nb] ?? nb;
  return na === nb || aliasA === nb || aliasB === na;
}

function webKeyPara(atributoNombre, productoNombre) {
  const nombreProducto = normalizarTexto(productoNombre);
  const nombreAtributo = normalizarTexto(atributoNombre);
  return (
    WEB_KEYS_POR_PRODUCTO[nombreProducto]?.[nombreAtributo] ??
    WEB_KEYS[nombreAtributo] ??
    null
  );
}

function firmaValores(ids) {
  return [...new Set(ids)].sort().join("|");
}

function generarCombinaciones(atributos) {
  if (atributos.length === 0) return [[]];
  return atributos.reduce(
    (acumulado, atributo) => {
      const siguiente = [];
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

function cargarEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const linea of raw.split("\n")) {
    if (!linea.includes("=") || linea.trim().startsWith("#")) continue;
    const i = linea.indexOf("=");
    env[linea.slice(0, i).trim()] = linea.slice(i + 1).trim();
  }
  return env;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "PicFotoPOS/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Tienda ${res.status} en ${url}`);
  return res.json();
}

async function listarProductosWeb(slug) {
  let all = [];
  for (let page = 1; page <= 10; page++) {
    const data = await fetchJson(
      `${STORE_URL}/products?category=${slug}&per_page=100&page=${page}`,
    );
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 100) break;
  }
  return all.map((p) => {
    const precio = Number(p.prices?.price);
    const decimales = p.prices?.currency_minor_unit ?? 2;
    return {
      id: p.id,
      nombre: p.name,
      tipo: p.type,
      precio: Number.isFinite(precio) ? precio / 10 ** decimales : null,
    };
  });
}

async function listarVariacionesWeb(parentId) {
  const variaciones = [];
  for (let page = 1; page <= 20; page++) {
    const data = await fetchJson(
      `${STORE_URL}/products?type=variation&parent=${parentId}&per_page=100&page=${page}`,
    );
    if (!Array.isArray(data) || data.length === 0) break;

    for (const variacion of data) {
      const precio = Number(variacion.prices?.price);
      const decimales = variacion.prices?.currency_minor_unit ?? 2;
      if (!Number.isFinite(precio)) continue;

      const atributos = {};
      try {
        const url = new URL(variacion.permalink);
        for (const [clave, valor] of url.searchParams) {
          if (clave.startsWith("attribute_pa_")) atributos[clave] = valor;
        }
      } catch {
        continue;
      }

      variaciones.push({
        id: variacion.id,
        precio: precio / 10 ** decimales,
        atributos,
      });
    }

    if (data.length < 100) break;
  }
  return variaciones;
}

function generarImportacionProducto(
  producto,
  variaciones,
  preciosExistentes,
  opciones = {},
) {
  const atributosPrecio = producto.atributos.filter((a) => a.afecta_precio);

  if (atributosPrecio.length === 0 && variaciones.length > 1) {
    throw new Error(
      `Marca al menos un atributo de precio en Productos antes de importar "${producto.nombre}".`,
    );
  }

  const sinClaveWeb = atributosPrecio
    .filter((atributo) => !webKeyPara(atributo.nombre, producto.nombre))
    .map((atributo) => atributo.nombre);
  if (sinClaveWeb.length > 0) {
    throw new Error(
      `No se pueden importar desde la tienda estos atributos de precio de "${producto.nombre}": ${sinClaveWeb.join(
        ", ",
      )}. Desmárcalos en Admin → Productos o configura su clave web.`,
    );
  }

  const clavesWeb = new Map();
  for (const atributo of atributosPrecio) {
    const clave = webKeyPara(atributo.nombre, producto.nombre);
    if (!clave) {
      throw new Error(
        `No se puede importar "${atributo.nombre}" de "${producto.nombre}": no tiene clave web. Desmárcalo en Admin → Productos o configura su clave.`,
      );
    }
    clavesWeb.set(atributo.atributo_id, clave);
  }

  const clavesEnVariaciones = new Set();
  for (const variacion of variaciones) {
    for (const clave of Object.keys(variacion.atributos)) {
      clavesEnVariaciones.add(clave);
    }
  }
  for (const [atributoId, clave] of clavesWeb) {
    if (!clavesEnVariaciones.has(clave)) {
      const nombre =
        atributosPrecio.find((a) => a.atributo_id === atributoId)?.nombre ??
        clave;
      throw new Error(
        `El atributo "${nombre}" está marcado como precio pero la tienda no lo incluye en las variaciones de "${producto.nombre}". Desmárcalo o corrige las variaciones.`,
      );
    }
  }

  const incompletos = [];
  const sinMapear = [];
  const entradas = [];

  for (const variacion of variaciones) {
    const valores = [];
    let incompleta = false;
    let disenoVacio = false;

    for (const atributo of atributosPrecio) {
      const clave = clavesWeb.get(atributo.atributo_id);
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

    if (!(variacion.precio > 0)) {
      sinMapear.push({
        variacion_id: variacion.id,
        motivo: "Precio 0 en la tienda",
      });
      continue;
    }

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

  const grupos = new Map();
  for (const entrada of entradas) {
    const firma = firmaValores(entrada.valores_ids);
    const lista = grupos.get(firma) ?? [];
    lista.push(entrada);
    grupos.set(firma, lista);
  }

  const filasImportadas = [];
  const conflictos = [];

  for (const grupo of grupos.values()) {
    const explicitos = grupo.filter((e) => !e.diseno_vacio);
    const candidatos = explicitos.length > 0 ? explicitos : grupo;
    const precios = [...new Set(candidatos.map((e) => e.precio))];

    if (precios.length > 1) {
      if (opciones.resolverConflictos) {
        const ordenados = [...candidatos].sort(
          (a, b) => a.variacion_id - b.variacion_id,
        );
        const elegida =
          opciones.resolverConflictos === "latest"
            ? ordenados[ordenados.length - 1]
            : ordenados[0];
        if (elegida) {
          filasImportadas.push({
            valores_ids: [...elegida.valores_ids],
            precio: elegida.precio,
            etiqueta: elegida.etiqueta,
          });
        }
        continue;
      }
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

  const valoresPermitidos = new Set(
    atributosPrecio.flatMap((a) => a.valores.map((v) => v.id)),
  );
  const atributoPorValor = new Map();
  for (const atributo of atributosPrecio) {
    for (const valor of atributo.valores) {
      atributoPorValor.set(valor.id, atributo.atributo_id);
    }
  }
  const existentesValidos = preciosExistentes.filter((existente) => {
    const ids = existente.valores_ids ?? [];
    if (ids.length !== atributosPrecio.length) return false;
    if (new Set(ids).size !== ids.length) return false;
    const atributos = new Set();
    for (const id of ids) {
      if (!valoresPermitidos.has(id)) return false;
      const atributoId = atributoPorValor.get(id);
      if (!atributoId || atributos.has(atributoId)) return false;
      atributos.add(atributoId);
    }
    return true;
  });

  const preciosFinales = new Map();
  for (const existente of existentesValidos) {
    preciosFinales.set(firmaValores(existente.valores_ids), {
      valores_ids: existente.valores_ids,
      precio: existente.precio,
      etiqueta: "",
      origen: "existente",
    });
  }

  let nuevos = 0;
  let actualizados = 0;
  let sinCambios = 0;
  for (const fila of filasImportadas) {
    const firma = firmaValores(fila.valores_ids);
    const existente = existentesValidos.find(
      (p) => firmaValores(p.valores_ids) === firma,
    );
    if (!existente) {
      nuevos++;
    } else if (Number(existente.precio) !== Number(fila.precio)) {
      actualizados++;
    } else {
      sinCambios++;
    }
    preciosFinales.set(firma, { ...fila, origen: "tienda" });
  }

  const conflictosPorFirma = new Set(
    conflictos.map((c) => firmaValores(c.valores_ids)),
  );
  const importadasPorFirma = new Set(
    filasImportadas.map((f) => firmaValores(f.valores_ids)),
  );
  const existentesPorFirma = new Set(
    existentesValidos.map((p) => firmaValores(p.valores_ids)),
  );
  const faltantes = [];
  for (const combinacion of generarCombinaciones(
    atributosPrecio.map((a) => ({ nombre: a.nombre, valores: a.valores })),
  )) {
    const firma = firmaValores(combinacion.map((v) => v.id));
    if (
      importadasPorFirma.has(firma) ||
      conflictosPorFirma.has(firma) ||
      existentesPorFirma.has(firma)
    ) {
      continue;
    }
    faltantes.push({
      valores_ids: combinacion.map((v) => v.id),
      etiqueta: combinacion.map((v) => v.valor).join(" · ") || "Precio base",
    });
  }

  return {
    atributos_precio: atributosPrecio.map((a) => a.atributo_id),
    filas: [...preciosFinales.values()],
    conflictos,
    incompletos,
    sin_mapear: sinMapear,
    faltantes,
    nuevos,
    actualizados,
    sin_cambios: sinCambios,
  };
}

async function main() {
  const env = cargarEnv();
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const categoryArg = args
    .find((a) => a.startsWith("--category="))
    ?.split("=")
    .slice(1)
    .join("=");
  const resolverConflictos = args
    .find((a) => a.startsWith("--conflicts="))
    ?.split("=")[1];

  async function fetchAll(query) {
    const rows = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await query().range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    return rows;
  }

  const [
    catsData,
    prodsData,
    mapData,
    attrsData,
    valsData,
    pavData,
    preciosData,
    admin,
  ] = await Promise.all([
    fetchAll(() => sb.from("categorias").select("id,nombre,activo")),
    fetchAll(() => sb.from("productos").select("id,categoria_id,nombre,activo")),
    fetchAll(() =>
      sb
        .from("producto_atributos")
        .select("id,producto_id,atributo_id,afecta_precio,orden"),
    ),
    fetchAll(() => sb.from("atributos").select("id,nombre")),
    fetchAll(() => sb.from("atributo_valores").select("id,atributo_id,valor")),
    fetchAll(() =>
      sb.from("producto_atributo_valores").select("producto_atributo_id,valor_id"),
    ),
    fetchAll(() =>
      sb.from("producto_precios").select("producto_id,valores_ids,precio"),
    ),
    sb
      .from("profiles")
      .select("id,nombre,rol")
      .in("rol", ["admin", "superadmin"])
      .limit(1),
  ]);

  const cats = { data: catsData };
  const prods = { data: prodsData };
  const map = { data: mapData };
  const attrs = { data: attrsData };
  const vals = { data: valsData };
  const pav = { data: pavData };
  const precios = { data: preciosData };

  for (const [nombre, res] of Object.entries({
    categorias: cats,
    productos: prods,
    producto_atributos: map,
    atributos: attrs,
    atributo_valores: vals,
    producto_atributo_valores: pav,
    producto_precios: precios,
  })) {
    if (res.error) throw new Error(`${nombre}: ${res.error.message}`);
  }

  const usuarioId = admin.data?.[0]?.id ?? null;
  const categoriaPorId = new Map(cats.data.map((c) => [c.id, c.nombre]));
  const nombrePorAtributo = new Map(attrs.data.map((a) => [a.id, a.nombre]));
  const valorPorId = new Map(vals.data.map((v) => [v.id, v.valor]));
  const valoresPorAtributo = new Map();
  for (const v of vals.data) {
    const lista = valoresPorAtributo.get(v.atributo_id) ?? [];
    lista.push(v);
    valoresPorAtributo.set(v.atributo_id, lista);
  }
  const valoresPorProductoAtributo = new Map();
  for (const r of pav.data) {
    const lista = valoresPorProductoAtributo.get(r.producto_atributo_id) ?? [];
    lista.push(r.valor_id);
    valoresPorProductoAtributo.set(r.producto_atributo_id, lista);
  }

  const productos = prods.data.filter((p) => p.activo);

  const storeCache = new Map();
  async function productosWeb(slug) {
    if (!storeCache.has(slug)) storeCache.set(slug, await listarProductosWeb(slug));
    return storeCache.get(slug);
  }

  const resumen = {
    productos_procesados: 0,
    productos_sin_tienda: 0,
    productos_error: 0,
    nuevos: 0,
    actualizados: 0,
    sin_cambios: 0,
    conflictos: 0,
    incompletos: 0,
    sin_mapear: 0,
    faltantes: 0,
    rpc_ok: 0,
    rpc_error: 0,
  };
  const detalleConflictos = [];
  const detalleIncompletos = [];
  const detalleSinMapear = [];
  const detalleFaltantes = [];
  const detalleErrores = [];

  for (const producto of productos) {
    const categoria = categoriaPorId.get(producto.categoria_id) ?? "";
    if (categoryArg && normalizarTexto(categoria) !== normalizarTexto(categoryArg)) {
      continue;
    }
    const slug = CATEGORIAS_WEB[normalizarTexto(categoria)];
    if (!slug) {
      resumen.productos_sin_tienda++;
      continue;
    }

    const mapping = map.data.filter((m) => m.producto_id === producto.id);
    const catalogoProducto = {
      id: producto.id,
      nombre: producto.nombre,
      atributos: mapping
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((m) => {
          const base = valoresPorAtributo.get(m.atributo_id) ?? [];
          const ids = valoresPorProductoAtributo.get(m.id);
          const valores = (ids && ids.length ? ids : base.map((v) => v.id)).map(
            (id) => ({ id, valor: valorPorId.get(id) ?? "" }),
          );
          return {
            atributo_id: m.atributo_id,
            nombre: nombrePorAtributo.get(m.atributo_id) ?? "",
            afecta_precio: Boolean(m.afecta_precio),
            valores,
          };
        }),
    };

    try {
      const web = await productosWeb(slug);
      const candidatos = web.filter((p) =>
        nombresEquivalentes(p.nombre, producto.nombre),
      );
      const prefiereVariable = catalogoProducto.atributos.some(
        (a) => a.afecta_precio,
      );
      const webProduct =
        candidatos.find(
          (p) => p.tipo === (prefiereVariable ? "variable" : "simple"),
        ) ?? candidatos[0];

      if (!webProduct) {
        resumen.productos_sin_tienda++;
        continue;
      }

      let variaciones;
      if (webProduct.tipo === "simple") {
        if (webProduct.precio === null) {
          throw new Error(`"${webProduct.nombre}" sin precio en la tienda`);
        }
        variaciones = [
          { id: webProduct.id, precio: webProduct.precio, atributos: {} },
        ];
      } else {
        variaciones = await listarVariacionesWeb(webProduct.id);
        if (variaciones.length === 0) {
          throw new Error(`La tienda no devolvió variaciones para "${webProduct.nombre}"`);
        }
      }

      const existentes = precios.data
        .filter((p) => p.producto_id === producto.id)
        .map((p) => ({ valores_ids: p.valores_ids, precio: p.precio }));

      const resultado = generarImportacionProducto(
        catalogoProducto,
        variaciones,
        existentes,
        { resolverConflictos },
      );

      resumen.productos_procesados++;
      resumen.nuevos += resultado.nuevos;
      resumen.actualizados += resultado.actualizados;
      resumen.sin_cambios += resultado.sin_cambios;
      resumen.conflictos += resultado.conflictos.length;
      resumen.incompletos += resultado.incompletos.length;
      resumen.sin_mapear += resultado.sin_mapear.length;
      resumen.faltantes += resultado.faltantes.length;

      for (const c of resultado.conflictos) {
        detalleConflictos.push({
          categoria,
          producto: producto.nombre,
          etiqueta: c.etiqueta,
          precios: c.precios,
          variaciones: c.variaciones,
        });
      }
      for (const i of resultado.incompletos) {
        detalleIncompletos.push({
          categoria,
          producto: producto.nombre,
          variacion_id: i.variacion_id,
          atributo: i.atributo,
          motivo: i.motivo,
        });
      }
      for (const s of resultado.sin_mapear) {
        detalleSinMapear.push({
          categoria,
          producto: producto.nombre,
          variacion_id: s.variacion_id,
          atributo: s.atributo,
          valor: s.valor,
          motivo: s.motivo,
        });
      }
      for (const f of resultado.faltantes) {
        detalleFaltantes.push({
          categoria,
          producto: producto.nombre,
          etiqueta: f.etiqueta,
        });
      }

      const hayCambios =
        resultado.nuevos > 0 || resultado.actualizados > 0;
      const debeLlamar =
        resultado.filas.length > 0 &&
        (hayCambios || existentes.length === 0);

      const etiquetaProducto = `${categoria} / ${producto.nombre}`;
      console.log(
        `${apply ? "APLICAR" : "SIMULA "} | ${etiquetaProducto} | tienda=${variaciones.length} ` +
          `nuevos=${resultado.nuevos} actualizados=${resultado.actualizados} ` +
          `iguales=${resultado.sin_cambios} conflictos=${resultado.conflictos.length} ` +
          `incompletos=${resultado.incompletos.length} sin_mapear=${resultado.sin_mapear.length} ` +
          `faltantes=${resultado.faltantes.length}` +
          (debeLlamar ? "" : " (sin cambios, no se escribe)"),
      );

      if (!apply || !debeLlamar) continue;

      const { error } = await sb.rpc("guardar_precios_producto", {
        p_producto_id: producto.id,
        p_atributos_precio: resultado.atributos_precio,
        p_precios: resultado.filas.map((f) => ({
          valores_ids: f.valores_ids,
          precio: f.precio,
        })),
        p_usuario_id: usuarioId,
      });

      if (error) {
        resumen.rpc_error++;
        detalleErrores.push({
          categoria,
          producto: producto.nombre,
          error: error.message,
        });
        console.error(`  ERROR RPC ${etiquetaProducto}: ${error.message}`);
      } else {
        resumen.rpc_ok++;
      }
    } catch (error) {
      resumen.productos_error++;
      detalleErrores.push({
        categoria,
        producto: producto.nombre,
        error: error.message,
      });
      console.error(
        `  ERROR ${categoria} / ${producto.nombre}: ${error.message}`,
      );
    }
  }

  console.log("\n===== RESUMEN =====");
  console.log(JSON.stringify(resumen, null, 2));

  if (detalleConflictos.length > 0) {
    console.log("\n===== CONFLICTOS (requieren revisión manual) =====");
    for (const c of detalleConflictos) {
      console.log(
        `- ${c.categoria} / ${c.producto} / ${c.etiqueta}: $${c.precios.join(" vs $")}`,
      );
    }
  }
  if (detalleIncompletos.length > 0) {
    console.log("\n===== INCOMPLETOS (revisión manual) =====");
    for (const i of detalleIncompletos) {
      console.log(
        `- ${i.categoria} / ${i.producto} / variación #${i.variacion_id}: ${i.motivo}${i.atributo ? ` (${i.atributo})` : ""}`,
      );
    }
  }
  if (detalleSinMapear.length > 0) {
    console.log("\n===== SIN MAPEAR (revisión manual) =====");
    for (const s of detalleSinMapear) {
      console.log(
        `- ${s.categoria} / ${s.producto} / variación #${s.variacion_id}: ${s.motivo}${s.valor ? ` - ${s.valor}` : ""}${s.atributo ? ` (${s.atributo})` : ""}`,
      );
    }
  }
  if (detalleFaltantes.length > 0) {
    console.log("\n===== SIN PRECIO (combinaciones esperadas) =====");
    for (const f of detalleFaltantes) {
      console.log(`- ${f.categoria} / ${f.producto} / ${f.etiqueta}`);
    }
  }
  if (detalleErrores.length > 0) {
    console.log("\n===== ERRORES =====");
    for (const e of detalleErrores) {
      console.log(`- ${e.categoria} / ${e.producto}: ${e.error}`);
    }
  }

  if (!apply) {
    console.log("\nModo simulación. Ejecuta con --apply para escribir en Supabase.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
