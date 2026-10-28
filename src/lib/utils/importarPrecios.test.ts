import { describe, expect, it } from "vitest";
import {
  construirCsvImportacion,
  generarImportacionProducto,
  normalizarTexto,
  type ProductoCatalogoPrecio,
  type VariacionWeb,
} from "./importarPrecios";
import { firmaValores } from "./precios";

const producto: ProductoCatalogoPrecio = {
  id: "p1",
  nombre: "Color Book Pasta Dura",
  atributos: [
    {
      atributo_id: "a-size",
      nombre: "Book Tamaño",
      afecta_precio: true,
      valores: [
        { id: "v-8x10", valor: '8x10"' },
        { id: "v-85x11h", valor: '8.5x11" Horizontal' },
        { id: "v-14x11", valor: '14x11" Vertical' },
      ],
    },
    {
      atributo_id: "a-pages",
      nombre: "Hojas y Páginas",
      afecta_precio: true,
      valores: [
        { id: "v-10", valor: "10 Hojas 20 Páginas" },
        { id: "v-20", valor: "20 Hojas 40 Páginas" },
      ],
    },
    {
      atributo_id: "a-extra",
      nombre: "Hoja Extra",
      afecta_precio: true,
      valores: [
        { id: "v-none", valor: "Ninguna" },
        { id: "v-1", valor: "1 Hoja" },
      ],
    },
    {
      atributo_id: "a-design",
      nombre: "Requiero Diseño",
      afecta_precio: true,
      valores: [
        { id: "v-no", valor: "No" },
        { id: "v-si", valor: "Si" },
      ],
    },
    {
      atributo_id: "a-color",
      nombre: "Color Vinipiel",
      afecta_precio: false,
      valores: [
        { id: "v-negro", valor: "Negro" },
        { id: "v-rojo", valor: "Rojo" },
      ],
    },
  ],
};

function variacion(
  id: number,
  precio: number,
  tamano: string,
  paginas: string,
  extra: string,
  diseno: string,
): VariacionWeb {
  return {
    id,
    precio,
    atributos: {
      "attribute_pa_tamanos-book": tamano,
      "attribute_pa_hojas-y-paginas": paginas,
      "attribute_pa_hoja-extra": extra,
      "attribute_pa_requiero-diseno": diseno,
    },
  };
}

describe("generarImportacionProducto", () => {
  it("mapea alias de tamaño, páginas, hoja extra y diseño", () => {
    const resultado = generarImportacionProducto(
      producto,
      [
        variacion(
          1,
          1000,
          "8-5x11″-horizontal",
          "10-hojas-20-paginas",
          "ninguna",
          "no",
        ),
      ],
      [],
    );

    expect(resultado.filas).toHaveLength(1);
    expect(resultado.filas[0].precio).toBe(1000);
    expect(resultado.filas[0].valores_ids).toEqual([
      "v-85x11h",
      "v-10",
      "v-none",
      "v-no",
    ]);
    expect(resultado.atributos_precio).toEqual([
      "a-size",
      "a-pages",
      "a-extra",
      "a-design",
    ]);
  });

  it("resuelve 14x11-2 por dimensión y diseños vacíos como No", () => {
    const resultado = generarImportacionProducto(
      producto,
      [
        variacion(
          2,
          4125,
          "14x11-2",
          "20-hojas-40-paginas",
          "ninguna",
          "",
        ),
      ],
      [],
    );

    expect(resultado.filas[0].valores_ids).toEqual([
      "v-14x11",
      "v-20",
      "v-none",
      "v-no",
    ]);
  });

  it("prefiere el diseño explícito sobre el vacío y detecta conflictos", () => {
    const resultado = generarImportacionProducto(
      producto,
      [
        variacion(3, 1000, "8x10", "10-hojas-20-paginas", "ninguna", "no"),
        variacion(4, 900, "8x10", "10-hojas-20-paginas", "ninguna", ""),
        variacion(5, 1200, "8x10", "10-hojas-20-paginas", "ninguna", "no"),
      ],
      [],
    );

    expect(resultado.filas).toHaveLength(0);
    expect(resultado.conflictos).toHaveLength(1);
    expect(resultado.conflictos[0].precios).toEqual([1000, 1200]);
    expect(resultado.conflictos[0].variaciones).toEqual([3, 5]);
  });

  it("omite la variación vacía si hay un No explícito con el mismo precio", () => {
    const resultado = generarImportacionProducto(
      producto,
      [
        variacion(6, 1000, "8x10", "10-hojas-20-paginas", "ninguna", "no"),
        variacion(7, 1000, "8x10", "10-hojas-20-paginas", "ninguna", ""),
      ],
      [],
    );

    expect(resultado.conflictos).toHaveLength(0);
    expect(resultado.filas).toHaveLength(1);
    expect(resultado.filas[0].precio).toBe(1000);
  });

  it("lista combinaciones faltantes e ignora atributos que no son de precio", () => {
    const resultado = generarImportacionProducto(
      producto,
      [
        variacion(8, 1000, "8x10", "10-hojas-20-paginas", "ninguna", "no"),
        {
          ...variacion(9, 1000, "8x10", "10-hojas-20-paginas", "ninguna", "no"),
          atributos: {
            ...variacion(
              9,
              1000,
              "8x10",
              "10-hojas-20-paginas",
              "ninguna",
              "no",
            ).atributos,
            "attribute_pa_color-vinipiel": "rojo",
          },
        },
      ],
      [],
    );

    expect(resultado.filas).toHaveLength(1);
    expect(resultado.conflictos).toHaveLength(0);
    expect(
      resultado.faltantes.some((f) =>
        f.etiqueta.includes("14x11") &&
        f.etiqueta.includes("20 Hojas 40 Páginas") &&
        f.etiqueta.includes("1 Hoja") &&
        f.etiqueta.includes("Si"),
      ),
    ).toBe(true);
  });

  it("reporta valores no mapeados y variaciones incompletas", () => {
    const resultado = generarImportacionProducto(
      producto,
      [
        variacion(10, 1000, "99x99", "10-hojas-20-paginas", "ninguna", "no"),
        variacion(11, 1000, "", "10-hojas-20-paginas", "ninguna", "no"),
      ],
      [],
    );

    expect(resultado.sin_mapear).toHaveLength(1);
    expect(resultado.incompletos).toHaveLength(1);
    expect(resultado.filas).toHaveLength(0);
  });

  it("fusiona precios existentes y respeta reemplazar", () => {
    const existente = {
      valores_ids: ["v-14x11", "v-20", "v-1", "v-si"],
      precio: 5000,
    };
    const variaciones = [
      variacion(12, 1000, "8x10", "10-hojas-20-paginas", "ninguna", "no"),
    ];

    const fusionado = generarImportacionProducto(producto, variaciones, [
      existente,
    ]);
    expect(fusionado.filas).toHaveLength(2);
    expect(
      fusionado.filas.some(
        (f) => firmaValores(f.valores_ids) === firmaValores(existente.valores_ids),
      ),
    ).toBe(true);

    const reemplazado = generarImportacionProducto(
      producto,
      variaciones,
      [existente],
      { reemplazar: true },
    );
    expect(reemplazado.filas).toHaveLength(1);
    expect(reemplazado.resumen.precios_existentes).toBe(1);
    expect(reemplazado.resumen.nuevos).toBe(1);
  });

  it("calcula nuevos, actualizados y sin cambios", () => {
    const resultado = generarImportacionProducto(
      producto,
      [
        variacion(13, 1000, "8x10", "10-hojas-20-paginas", "ninguna", "no"),
        variacion(14, 2000, "14x11-2", "20-hojas-40-paginas", "ninguna", "si"),
      ],
      [
        { valores_ids: ["v-8x10", "v-10", "v-none", "v-no"], precio: 900 },
        { valores_ids: ["v-14x11", "v-20", "v-none", "v-si"], precio: 2000 },
      ],
    );

    expect(resultado.resumen.nuevos).toBe(0);
    expect(resultado.resumen.actualizados).toBe(1);
    expect(resultado.resumen.sin_cambios).toBe(1);
  });

  it("genera detalle con estado y CSV descargable", () => {
    const resultado = generarImportacionProducto(
      producto,
      [
        variacion(20, 1000, "8x10", "10-hojas-20-paginas", "ninguna", "no"),
        variacion(21, 2000, "14x11-2", "20-hojas-40-paginas", "ninguna", "si"),
      ],
      [{ valores_ids: ["v-8x10", "v-10", "v-none", "v-no"], precio: 900 }],
    );

    expect(resultado.detalle.map((f) => f.estado).sort()).toEqual([
      "actualizado",
      "nuevo",
    ]);

    const csv = construirCsvImportacion({
      producto: producto.nombre,
      detalle: resultado.detalle,
      conflictos: resultado.conflictos,
      faltantes: resultado.faltantes,
      incompletos: resultado.incompletos,
      sin_mapear: resultado.sin_mapear,
    });

    expect(csv).toContain('"Producto","Variante","Precio","Estado","Detalle"');
    expect(csv).toContain("Actualizado");
    expect(csv).toContain("Nuevo");
    expect(csv).toContain("Faltante");
  });
});

describe("Mini Books", () => {
  const productoMini: ProductoCatalogoPrecio = {
    id: "mb1",
    nombre: "Mini Book Pasta Dura",
    atributos: [
      {
        atributo_id: "mb-size",
        nombre: "Mini Book Tamaño",
        afecta_precio: true,
        valores: [
          { id: "mb-6x6", valor: '6x6"' },
          { id: "mb-6x85h", valor: '6x8.5" Horizontal' },
          { id: "mb-85x6v", valor: '8.5x6" Vertical' },
          { id: "mb-7x5", valor: '7x5"' },
          { id: "mb-8x8", valor: '8x8"' },
        ],
      },
      {
        atributo_id: "mb-pages",
        nombre: "Hojas y Páginas",
        afecta_precio: true,
        valores: [
          { id: "mb-10", valor: "10 Hojas 20 Páginas" },
          { id: "mb-15", valor: "15 Hojas 30 Páginas" },
        ],
      },
      {
        atributo_id: "mb-extra",
        nombre: "Hoja Extra",
        afecta_precio: true,
        valores: [
          { id: "mb-none", valor: "Ninguna" },
          { id: "mb-1", valor: "1 Hoja" },
        ],
      },
      {
        atributo_id: "mb-design",
        nombre: "Requiero Diseño",
        afecta_precio: true,
        valores: [
          { id: "mb-no", valor: "No" },
          { id: "mb-si", valor: "Si" },
        ],
      },
    ],
  };

  function variacionMini(
    id: number,
    precio: number,
    tamano: string,
    paginas: string,
    extra: string,
    diseno: string,
  ): VariacionWeb {
    return {
      id,
      precio,
      atributos: {
        "attribute_pa_tamanos-mini-books": tamano,
        "attribute_pa_hojas-y-paginas": paginas,
        "attribute_pa_hoja-extra": extra,
        "attribute_pa_requiero-diseno": diseno,
      },
    };
  }

  it("mapea las tallas y variantes de Mini Books", () => {
    const resultado = generarImportacionProducto(
      productoMini,
      [
        variacionMini(
          1,
          500,
          "6x8-5-horizontal",
          "10-hojas-20-paginas",
          "ninguna",
          "no",
        ),
        variacionMini(
          2,
          700,
          "8-5x6",
          "15-hojas-30-paginas",
          "1-hoja",
          "si",
        ),
        variacionMini(3, 350, "6x6", "10-hojas-20-paginas", "ninguna", "no"),
      ],
      [],
    );

    expect(
      resultado.detalle.find((f) => f.precio === 500)?.valores_ids,
    ).toEqual(["mb-6x85h", "mb-10", "mb-none", "mb-no"]);
    expect(
      resultado.detalle.find((f) => f.precio === 700)?.valores_ids,
    ).toEqual(["mb-85x6v", "mb-15", "mb-1", "mb-si"]);
    expect(
      resultado.detalle.find((f) => f.precio === 350)?.valores_ids,
    ).toEqual(["mb-6x6", "mb-10", "mb-none", "mb-no"]);
  });
});

describe("Acrílicos", () => {
  const productoAcrilico: ProductoCatalogoPrecio = {
    id: "acr1",
    nombre: "Acrílico Flotado",
    atributos: [
      {
        atributo_id: "acr-size",
        nombre: "Impresión Tamaño",
        afecta_precio: true,
        valores: [
          { id: "acr-18", valor: '18.8x26.8"' },
          { id: "acr-21", valor: '21.2x63.2"' },
          { id: "acr-85x11", valor: '8.5x11"' },
          { id: "acr-30", valor: '30x30"' },
        ],
      },
      {
        atributo_id: "acr-grosor",
        nombre: "Grosor",
        afecta_precio: false,
        valores: [{ id: "acr-2mm", valor: "2mm" }],
      },
    ],
  };

  it("mapea tamaños de Impresión Tamaño y los slugs de la web", () => {
    const resultado = generarImportacionProducto(
      productoAcrilico,
      [
        {
          id: 1,
          precio: 350,
          atributos: {
            "attribute_pa_tamano-de-impresion": "18-8x26-8",
            "attribute_pa_grosor": "2mm",
          },
        },
        {
          id: 2,
          precio: 420,
          atributos: {
            "attribute_pa_tamano-de-impresion": "21-2x63-2",
            "attribute_pa_grosor": "2mm",
          },
        },
        {
          id: 3,
          precio: 110,
          atributos: {
            "attribute_pa_tamano-de-impresion": "8-5x11",
            "attribute_pa_grosor": "2mm",
          },
        },
        {
          id: 4,
          precio: 2850,
          atributos: {
            "attribute_pa_tamano-de-impresion": "30x30",
            "attribute_pa_grosor": "2mm",
          },
        },
      ],
      [],
    );

    expect(resultado.detalle.map((f) => f.valores_ids)).toEqual([
      ["acr-18"],
      ["acr-21"],
      ["acr-85x11"],
      ["acr-30"],
    ]);
    expect(resultado.faltantes).toHaveLength(0);
  });
});

describe("Adhesivos", () => {
  it("decodifica entidades HTML y mapea rollos por dimensión", () => {
    expect(normalizarTexto("21 x 25&#8243;")).toBe("21 x 25");

    const productoRollo: ProductoCatalogoPrecio = {
      id: "rollo1",
      nombre: "Rollo de Adhesivo",
      atributos: [
        {
          atributo_id: "rollo-ancho",
          nombre: "Ancho de Rollo",
          afecta_precio: true,
          valores: [
            { id: "r-25x36", valor: '25"x36m (63.5cmx36m)' },
            { id: "r-50x36", valor: '50"x36m (127cmx36m)' },
            { id: "r-25x41", valor: '25"x41m (63.5cmx41m)' },
            { id: "r-50x41", valor: '50"x41m (127cmx41m)' },
          ],
        },
      ],
    };

    const resultado = generarImportacionProducto(
      productoRollo,
      [
        {
          id: 1,
          precio: 2200,
          atributos: { "attribute_pa_ancho-de-rollo": "2536m" },
        },
        {
          id: 2,
          precio: 4450,
          atributos: { "attribute_pa_ancho-de-rollo": "50x36m" },
        },
        {
          id: 3,
          precio: 1500,
          atributos: {
            "attribute_pa_ancho-de-rollo": "25x41m-635cmx41m",
          },
        },
        {
          id: 4,
          precio: 3000,
          atributos: {
            "attribute_pa_ancho-de-rollo": "50x41m127cmx41m",
          },
        },
      ],
      [],
    );

    expect(resultado.detalle.map((f) => f.valores_ids)).toEqual([
      ["r-25x36"],
      ["r-50x36"],
      ["r-25x41"],
      ["r-50x41"],
    ]);
    expect(resultado.faltantes).toHaveLength(0);
  });

  it("mapea Tamaño Easy Sheet con slugs y dimensiones secundarias", () => {
    const productoEasy: ProductoCatalogoPrecio = {
      id: "easy1",
      nombre: "hoja de Easy Sheet",
      atributos: [
        {
          atributo_id: "easy-size",
          nombre: "Tamaño Easy Sheet",
          afecta_precio: true,
          valores: [
            { id: "e-10", valor: '10x10" (25x25cm)' },
            { id: "e-12x18", valor: '12x18" (30x46cm)' },
          ],
        },
      ],
    };

    const resultado = generarImportacionProducto(
      productoEasy,
      [
        {
          id: 1,
          precio: 15,
          atributos: { "attribute_pa_tamano-easy-sheet": "10x10" },
        },
        {
          id: 2,
          precio: 24,
          atributos: {
            "attribute_pa_tamano-easy-sheet": "12x18-30x46cm",
          },
        },
      ],
      [],
    );

    expect(resultado.detalle.map((f) => f.valores_ids)).toEqual([
      ["e-10"],
      ["e-12x18"],
    ]);
  });

  it("importa un producto simple como precio base", () => {
    const productoSimple: ProductoCatalogoPrecio = {
      id: "simple1",
      nombre: "Pliego Adhesivo",
      atributos: [],
    };

    const resultado = generarImportacionProducto(
      productoSimple,
      [{ id: 1, precio: 25, atributos: {} }],
      [],
    );

    expect(resultado.atributos_precio).toEqual([]);
    expect(resultado.detalle).toEqual([
      {
        valores_ids: [],
        precio: 25,
        etiqueta: "Precio base",
        estado: "nuevo",
      },
    ]);
    expect(resultado.faltantes).toHaveLength(0);
  });
});

describe("Estuches y Cajas", () => {
  const productoCaja: ProductoCatalogoPrecio = {
    id: "caja1",
    nombre: "Caja para Book Lisa",
    atributos: [
      {
        atributo_id: "caja-size",
        nombre: "Caja Tamaño",
        afecta_precio: true,
        valores: [
          { id: "c-8x8", valor: '8x8"' },
          { id: "c-8x10", valor: '8x10"' },
          { id: "c-10x10", valor: '10x10"' },
          { id: "c-11x14", valor: '11x14"' },
          { id: "c-12x12", valor: '12x12"' },
        ],
      },
      {
        atributo_id: "caja-color",
        nombre: "Color Vinipiel",
        afecta_precio: false,
        valores: [{ id: "c-negro", valor: "Negro" }],
      },
    ],
  };

  it("mapea los tamaños de caja e ignora el color", () => {
    const resultado = generarImportacionProducto(
      productoCaja,
      [
        {
          id: 1,
          precio: 380,
          atributos: { "attribute_pa_tamano-de-caja": "8x8" },
        },
        {
          id: 2,
          precio: 450,
          atributos: { "attribute_pa_tamano-de-caja": "10x10" },
        },
        {
          id: 3,
          precio: 800,
          atributos: { "attribute_pa_tamano-de-caja": "11x14" },
        },
        {
          id: 4,
          precio: 550,
          atributos: { "attribute_pa_tamano-de-caja": "12x12" },
        },
      ],
      [],
    );

    expect(resultado.detalle.map((f) => f.valores_ids)).toEqual([
      ["c-8x8"],
      ["c-10x10"],
      ["c-11x14"],
      ["c-12x12"],
    ]);
    expect(resultado.faltantes.map((f) => f.etiqueta)).toContain('8x10"');
  });
});

describe("Impresiones", () => {
  it("mapea papel y tipo de impresión con sus slugs", () => {
    const productoImpresion: ProductoCatalogoPrecio = {
      id: "imp1",
      nombre: "Impresión Fotográfica Digital",
      atributos: [
        {
          atributo_id: "imp-size",
          nombre: "Impresión Tamaño",
          afecta_precio: true,
          valores: [
            { id: "i-8x10", valor: '8x10"' },
            { id: "i-20x30", valor: '20x30"' },
          ],
        },
        {
          atributo_id: "imp-papel",
          nombre: "Papel",
          afecta_precio: true,
          valores: [
            { id: "i-lustre", valor: "Lustre" },
            { id: "i-metalico", valor: "Metálico" },
          ],
        },
        {
          atributo_id: "imp-margen",
          nombre: "Margen Blanco",
          afecta_precio: false,
          valores: [{ id: "i-no", valor: "No" }],
        },
      ],
    };

    const resultado = generarImportacionProducto(
      productoImpresion,
      [
        {
          id: 1,
          precio: 12,
          atributos: {
            "attribute_pa_tamano-de-impresion": "8x10",
            "attribute_pa_papel": "lustre",
          },
        },
        {
          id: 2,
          precio: 60,
          atributos: {
            "attribute_pa_tamano-de-impresion": "8x10",
            "attribute_pa_papel": "metalico",
          },
        },
      ],
      [],
    );

    expect(resultado.detalle.map((f) => f.valores_ids)).toEqual([
      ["i-8x10", "i-lustre"],
      ["i-8x10", "i-metalico"],
    ]);
  });

  it("mapea el tipo de impresión y deja faltantes los combos no publicados", () => {
    const productoTextura: ProductoCatalogoPrecio = {
      id: "imp2",
      nombre: "Papel con textura",
      atributos: [
        {
          atributo_id: "t-size",
          nombre: "Impresión Tamaño",
          afecta_precio: true,
          valores: [{ id: "t-20x30", valor: '20x30"' }],
        },
        {
          atributo_id: "t-tipo",
          nombre: "Tipo de Impresión",
          afecta_precio: true,
          valores: [
            { id: "t-textura", valor: "Impresión con Textura" },
            {
              id: "t-adhesivo",
              valor: "Impresión con Textura y Adhesivo",
            },
          ],
        },
      ],
    };

    const resultado = generarImportacionProducto(
      productoTextura,
      [
        {
          id: 1,
          precio: 222,
          atributos: {
            "attribute_pa_tamano-de-impresion": "20x30",
            "attribute_pa_tipo-de-impresion": "impresion-con-textura",
          },
        },
        {
          id: 2,
          precio: 259,
          atributos: {
            "attribute_pa_tamano-de-impresion": "20x30",
            "attribute_pa_tipo-de-impresion":
              "impresion-con-textura-y-adhesivo",
          },
        },
      ],
      [],
    );

    expect(resultado.detalle.map((f) => f.valores_ids)).toEqual([
      ["t-20x30", "t-textura"],
      ["t-20x30", "t-adhesivo"],
    ]);
  });
});

describe("Ink Jet", () => {
  it("mapea tipo de papel, tamaño y cantidad de hojas", () => {
    const productoPapel: ProductoCatalogoPrecio = {
      id: "ink1",
      nombre: "Pack hojas Papel InkJet",
      atributos: [
        {
          atributo_id: "ink-type",
          nombre: "Tipo de papel Ink Jet",
          afecta_precio: true,
          valores: [
            { id: "it-glossy", valor: "Glossy" },
            { id: "it-satin", valor: "Satin/Lustre" },
          ],
        },
        {
          atributo_id: "ink-size",
          nombre: "Papel Tamaño",
          afecta_precio: true,
          valores: [
            { id: "is-4x6", valor: '4x6" (10x15cm)' },
            { id: "is-85x11", valor: '8.5x11" (21.5x28cm)' },
          ],
        },
        {
          atributo_id: "ink-qty",
          nombre: "Cantidad de Hojas",
          afecta_precio: true,
          valores: [
            { id: "iq-20", valor: "20 Hojas" },
            { id: "iq-100", valor: "100 Hojas" },
          ],
        },
      ],
    };

    const resultado = generarImportacionProducto(
      productoPapel,
      [
        {
          id: 1,
          precio: 140,
          atributos: {
            "attribute_pa_tipo-de-papel-ink-jet": "satin-lustre",
            "attribute_pa_papel-tamano": "8-5x11-21-5x28cm",
            "attribute_pa_cantidad-de-hojas": "20-hojas",
          },
        },
        {
          id: 2,
          precio: 155,
          atributos: {
            "attribute_pa_tipo-de-papel-ink-jet": "glossy",
            "attribute_pa_papel-tamano": "4x6-10x15cm",
            "attribute_pa_cantidad-de-hojas": "100-hojas",
          },
        },
      ],
      [],
    );

    expect(resultado.detalle.map((f) => f.valores_ids)).toEqual([
      ["it-satin", "is-85x11", "iq-20"],
      ["it-glossy", "is-4x6", "iq-100"],
    ]);
    expect(resultado.faltantes.length).toBeGreaterThan(0);
  });
});

describe("Rollos de Laminado", () => {
  it("usa la clave web específica de Laminado Cristal y decodifica el valor", () => {
    const producto: ProductoCatalogoPrecio = {
      id: "lam-cristal",
      nombre: "Rollo de Laminado Cristal",
      atributos: [
        {
          atributo_id: "lc-ancho",
          nombre: "Ancho de Rollo",
          afecta_precio: true,
          valores: [
            { id: "lc-25", valor: '25"x30m (63.5cmx30m)' },
            { id: "lc-50", valor: '50"x30m (127cmx30m)' },
          ],
        },
      ],
    };

    const resultado = generarImportacionProducto(
      producto,
      [
        {
          id: 1,
          precio: 1300,
          atributos: {
            "attribute_pa_rollo-de-laminado-cristal":
              "25%e2%80%b3x30m-63-5cmx30m",
          },
        },
      ],
      [],
    );

    expect(resultado.detalle[0].valores_ids).toEqual(["lc-25"]);
    expect(resultado.sin_mapear).toHaveLength(0);
  });

  it("mapea textura y omite variaciones con precio 0", () => {
    const producto: ProductoCatalogoPrecio = {
      id: "lam-foto",
      nombre: "Rollo de Laminado Fotográfico",
      atributos: [
        {
          atributo_id: "lf-ancho",
          nombre: "Ancho de Rollo",
          afecta_precio: true,
          valores: [
            { id: "lf-25", valor: '25"x41m (63.5cmx41m)' },
            { id: "lf-50", valor: '50"x41m (127cmx41m)' },
          ],
        },
        {
          atributo_id: "lf-textura",
          nombre: "Textura",
          afecta_precio: true,
          valores: [
            { id: "lf-seda", valor: "Seda" },
            { id: "lf-granizo", valor: "Granizo" },
          ],
        },
      ],
    };

    const resultado = generarImportacionProducto(
      producto,
      [
        {
          id: 1,
          precio: 1300,
          atributos: {
            "attribute_pa_ancho-de-rollo": "25x41m",
            "attribute_pa_textura": "seda",
          },
        },
        {
          id: 2,
          precio: 0,
          atributos: {
            "attribute_pa_ancho-de-rollo": "50x41m",
            "attribute_pa_textura": "granizo",
          },
        },
      ],
      [],
    );

    expect(resultado.detalle).toHaveLength(1);
    expect(resultado.detalle[0].valores_ids).toEqual(["lf-25", "lf-seda"]);
    expect(resultado.sin_mapear).toEqual([
      { variacion_id: 2, motivo: "Precio 0 en la tienda" },
    ]);
    expect(resultado.faltantes.map((f) => f.etiqueta)).toContain(
      '50"x41m (127cmx41m) · Granizo',
    );
  });
});

describe("Marcos", () => {
  it("mapea Tamaño de Marco e ignora el color", () => {
    const producto: ProductoCatalogoPrecio = {
      id: "marco1",
      nombre: "Moldura 004",
      atributos: [
        {
          atributo_id: "m-size",
          nombre: "Tamaño de Marco",
          afecta_precio: true,
          valores: [
            { id: "m-8x10", valor: '8x10"' },
            { id: "m-85x11", valor: '8.5x11"' },
          ],
        },
        {
          atributo_id: "m-color",
          nombre: "Color marco",
          afecta_precio: false,
          valores: [
            { id: "m-negro", valor: "Negro" },
            { id: "m-oro", valor: "Oro" },
          ],
        },
      ],
    };

    const resultado = generarImportacionProducto(
      producto,
      [
        {
          id: 1,
          precio: 135,
          atributos: {
            "attribute_pa_tamano-de-marco": "8-5x11",
            "attribute_pa_color-de-marco-2": "oro",
          },
        },
        {
          id: 2,
          precio: 135,
          atributos: {
            "attribute_pa_tamano-de-marco": "8-5x11",
            "attribute_pa_color-de-marco-2": "negro",
          },
        },
      ],
      [],
    );

    expect(resultado.detalle).toHaveLength(1);
    expect(resultado.detalle[0].valores_ids).toEqual(["m-85x11"]);
    expect(resultado.detalle[0].precio).toBe(135);
  });
});
