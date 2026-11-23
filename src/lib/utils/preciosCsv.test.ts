import { describe, expect, it } from "vitest";
import {
  construirLogPreciosCsv,
  construirPayloadCreacionProducto,
  construirPlanAplicacionPreciosCsv,
  construirPlantillaPreciosCsv,
  construirPrevisualizacionPreciosCsv,
  parsearCsv,
  parsearPrecioCsv,
  type ContextoPreciosCategoria,
} from "./preciosCsv";

const contexto: ContextoPreciosCategoria = {
  categoria_id: "cat-marcos",
  categoria_nombre: "Marcos",
  permite_crear_productos: true,
  atributos_precio_catalogo: [
    {
      atributo_id: "a-tamano",
      nombre: "Tamaño de Marco",
      valores: [
        { id: "v-8x10", valor: '8x10"' },
        { id: "v-85x11", valor: '8.5x11"' },
      ],
    },
  ],
  atributos_informativos_catalogo: [
    { atributo_id: "a-color", nombre: "Color marco" },
  ],
  colores_globales: [
    { id: "c-negro", valor: "Negro" },
    { id: "c-oro", valor: "Oro" },
  ],
  productos: [
    {
      id: "p-004",
      nombre: "Moldura 004",
      atributos_precio: [
        {
          atributo_id: "a-tamano",
          nombre: "Tamaño de Marco",
          valores: [
            { id: "v-8x10", valor: '8x10"' },
            { id: "v-85x11", valor: '8.5x11"' },
          ],
        },
      ],
      atributos_informativos: [
        { nombre: "Color marco", valores: ["Negro", "Oro", "Plata"] },
      ],
      precios: [
        { valores_ids: ["v-8x10"], precio: 130 },
        { valores_ids: ["v-85x11"], precio: 135 },
      ],
    },
  ],
};

describe("parsearPrecioCsv", () => {
  it("acepta punto y coma decimal", () => {
    expect(parsearPrecioCsv("130")).toBe(130);
    expect(parsearPrecioCsv("136,50")).toBe(136.5);
    expect(parsearPrecioCsv("$1,234.50")).toBe(1234.5);
    expect(parsearPrecioCsv("1.234,50")).toBe(1234.5);
    expect(parsearPrecioCsv("1,234")).toBe(1234);
    expect(parsearPrecioCsv("0,500")).toBe(0.5);
    expect(parsearPrecioCsv("0.500")).toBe(0.5);
  });

  it("rechaza valores inválidos", () => {
    expect(parsearPrecioCsv("")).toBeNull();
    expect(parsearPrecioCsv("abc")).toBeNull();
    expect(parsearPrecioCsv("-5")).toBeNull();
  });
});

describe("parsearCsv", () => {
  it("detecta punto y coma y quita la línea sep=", () => {
    const filas = parsearCsv(
      "sep=;\nProducto;Tamaño;Precio\nMoldura 004;8x10\";130,00",
    );

    expect(filas).toEqual([
      ["Producto", "Tamaño", "Precio"],
      ["Moldura 004", '8x10"', "130,00"],
    ]);
  });

  it("detecta coma y respeta comillas", () => {
    const filas = parsearCsv(
      'Producto,Tamaño,Precio\nMoldura 004,"8x10""",130.00',
    );

    expect(filas[1]).toEqual(["Moldura 004", '8x10"', "130.00"]);
  });
});

describe("construirPlantillaPreciosCsv", () => {
  it("genera una fila por combinación con precio actual", () => {
    const plantilla = construirPlantillaPreciosCsv(contexto);
    const lineas = plantilla.contenido.split("\n");

    expect(plantilla.filas).toBe(2);
    expect(plantilla.nombreArchivo).toBe("precios-marcos.csv");
    expect(lineas[0]).toBe("sep=;");
    expect(lineas[1]).toContain('"Tamaño de Marco"');
    expect(lineas[1]).toContain('"Color marco"');
    expect(lineas[1]).toContain('"Precio actual"');
    expect(lineas[2]).toContain('"8x10"""');
    expect(lineas[2]).toContain('"Negro | Oro | Plata"');
    expect(lineas[2]).toContain('"130,00"');
  });
});

describe("construirPrevisualizacionPreciosCsv", () => {
  it("marca actualizaciones, sin cambios y errores", () => {
    const csv = `sep=;
Categoría;Producto;Tamaño de Marco;Precio actual;Precio nuevo
Marcos;Moldura 004;8x10";130,00;136,50
Marcos;Moldura 004;8.5x11";135,00;
Marcos;Moldura 004;9x12";0,00;100,00
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv);

    expect(preview.resumen.total_filas).toBe(3);
    expect(preview.resumen.actualizadas).toBe(1);
    expect(preview.resumen.sin_cambios).toBe(1);
    expect(preview.resumen.errores).toBe(1);
    expect(preview.errores[0].fila).toBe(4);
    expect(preview.filas[0]).toMatchObject({
      producto_id: "p-004",
      etiqueta: '8x10"',
      precio_actual: 130,
      precio_nuevo: 136.5,
      estado: "actualizado",
    });
  });

  it("ignora la columna informativa Color marco", () => {
    const csv = `Producto;Tamaño de Marco;Color marco;Precio nuevo
Moldura 004;8x10";Negro | Oro;140
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv);

    expect(preview.errores).toEqual([]);
    expect(preview.filas[0]).toMatchObject({
      valores_ids: ["v-8x10"],
      precio_nuevo: 140,
      estado: "actualizado",
    });
  });

  it("normaliza tamaños con espacios y comillas", () => {
    const csv = `Categoría,Producto,Tamaño de Marco,Precio actual,Precio nuevo
Marcos,Moldura 004,8 X 10,130.00,140.00
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv);

    expect(preview.errores).toEqual([]);
    expect(preview.filas[0]).toMatchObject({
      valores_ids: ["v-8x10"],
      precio_nuevo: 140,
      estado: "actualizado",
    });
  });

  it("detecta productos y variantes duplicadas", () => {
    const csv = `Producto;Tamaño de Marco;Precio nuevo
Moldura 004;8x10";140
Moldura 004;8 X 10;150
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv);

    expect(preview.errores).toHaveLength(1);
    expect(preview.errores[0].mensaje).toMatch(/duplicada/i);
  });

  it("trata precio vacío como sin cambio", () => {
    const csv = `Producto;Tamaño de Marco;Precio nuevo
Moldura 004;8x10";
Moldura 004;8.5x11";
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv);
    const plan = construirPlanAplicacionPreciosCsv(preview, contexto);

    expect(preview.errores).toEqual([]);
    expect(preview.resumen.sin_cambios).toBe(2);
    expect(plan.productos).toEqual([]);
  });
});

describe("construirPlanAplicacionPreciosCsv", () => {
  it("preserva precios existentes que no vienen en el archivo", () => {
    const csv = `Producto;Tamaño de Marco;Precio nuevo
Moldura 004;8x10";140
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv);
    const plan = construirPlanAplicacionPreciosCsv(preview, contexto);

    expect(plan.errores).toEqual([]);
    expect(plan.productos).toHaveLength(1);
    expect(plan.productos[0].cambios).toBe(1);
    expect(plan.productos[0].precios).toEqual(
      expect.arrayContaining([
        { valores_ids: ["v-8x10"], precio: 140 },
        { valores_ids: ["v-85x11"], precio: 135 },
      ]),
    );
    expect(plan.productos[0].precios).toHaveLength(2);
  });

  it("no genera plan si hay errores", () => {
    const csv = `Producto;Tamaño de Marco;Precio nuevo
Moldura 004;99x99";140
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv);
    const plan = construirPlanAplicacionPreciosCsv(preview, contexto);

    expect(preview.errores.length).toBeGreaterThan(0);
    expect(plan.productos).toEqual([]);
  });
});

describe("creación de productos faltantes", () => {
  const csvNuevo = `Producto;Tamaño de Marco;Color marco;Precio actual;Precio nuevo
Moldura Nueva;8x10";Negro | Oro | Plata;100,00;
Moldura Nueva;8.5x11";Negro | Oro | Plata;110,00;
`;

  it("sin la opción, el producto desconocido es error", () => {
    const preview = construirPrevisualizacionPreciosCsv(contexto, csvNuevo);

    expect(preview.errores.length).toBeGreaterThan(0);
    expect(preview.errores[0].mensaje).toMatch(/no existe/i);
    expect(preview.productos_nuevos).toEqual([]);
  });

  it("detecta el producto nuevo, usa Precio actual y calcula colores nuevos", () => {
    const preview = construirPrevisualizacionPreciosCsv(contexto, csvNuevo, {
      crearProductosFaltantes: true,
    });

    expect(preview.errores).toEqual([]);
    expect(preview.productos_nuevos).toHaveLength(1);
    expect(preview.productos_nuevos[0]).toMatchObject({
      nombre: "Moldura Nueva",
      colores: ["Negro", "Oro", "Plata"],
      colores_nuevos: ["Plata"],
      precio_min: 100,
      precio_max: 110,
    });
    expect(preview.resumen.productos_nuevos).toBe(1);
    expect(preview.resumen.colores_nuevos).toBe(1);
    expect(preview.resumen.precios_nuevos).toBe(2);

    const plan = construirPlanAplicacionPreciosCsv(preview, contexto);
    expect(plan.errores).toEqual([]);
    expect(plan.productos_nuevos).toHaveLength(1);
    expect(plan.productos_nuevos[0].precios).toEqual(
      expect.arrayContaining([
        { valores_ids: ["v-8x10"], precio: 100 },
        { valores_ids: ["v-85x11"], precio: 110 },
      ]),
    );
  });

  it("rechaza colores inconsistentes entre filas de la misma moldura", () => {
    const csv = `Producto;Tamaño de Marco;Color marco;Precio nuevo
Moldura Nueva;8x10";Negro | Oro;100
Moldura Nueva;8.5x11";Negro | Plata;110
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv, {
      crearProductosFaltantes: true,
    });

    expect(preview.errores.some((error) => /colores no coinciden/i.test(error.mensaje))).toBe(
      true,
    );
  });

  it("crea productos cuando la categoría aún no tiene molduras", () => {
    const contextoVacio: ContextoPreciosCategoria = {
      categoria_id: "cat-marcos",
      categoria_nombre: "Marcos",
      permite_crear_productos: true,
      atributos_precio_catalogo: [
        {
          atributo_id: "a-tamano",
          nombre: "Tamaño de Marco",
          valores: [
            { id: "v-8x10", valor: '8x10"' },
            { id: "v-85x11", valor: '8.5x11"' },
          ],
        },
      ],
      atributos_informativos_catalogo: [
        { atributo_id: "a-color", nombre: "Color marco" },
      ],
      colores_globales: [
        { id: "c-negro", valor: "004-000 - Negro" },
        { id: "c-walnut", valor: "004-003 - Walnut" },
      ],
      productos: [],
    };

    const csv = `Producto;Tamaño de Marco;Color marco;Precio nuevo
Moldura 004;8x10";004-000 - Negro | 004-003 - Walnut;130
Moldura 004;8.5x11";004-000 - Negro | 004-003 - Walnut;135
`;

    const preview = construirPrevisualizacionPreciosCsv(contextoVacio, csv, {
      crearProductosFaltantes: true,
    });

    expect(preview.errores).toEqual([]);
    expect(preview.productos_nuevos).toHaveLength(1);
    expect(preview.productos_nuevos[0].colores_nuevos).toEqual([]);
    expect(preview.resumen.productos_nuevos).toBe(1);
    expect(preview.resumen.colores_nuevos).toBe(0);
    expect(preview.resumen.precios_nuevos).toBe(2);

    const plan = construirPlanAplicacionPreciosCsv(preview, contextoVacio);
    expect(plan.errores).toEqual([]);
    expect(plan.productos_nuevos).toHaveLength(1);
    expect(plan.productos_nuevos[0].precios).toHaveLength(2);
  });

  it("rechaza producto nuevo sin precio", () => {
    const csv = `Producto;Tamaño de Marco;Color marco;Precio actual;Precio nuevo
Moldura Nueva;8x10";Negro;;
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv, {
      crearProductosFaltantes: true,
    });

    expect(preview.errores.some((error) => /no tiene precio/i.test(error.mensaje))).toBe(
      true,
    );
  });
});

describe("construirPayloadCreacionProducto", () => {
  it("normaliza colores y arma atributos y precios", () => {
    const payload = construirPayloadCreacionProducto(
      {
        nombre: "Moldura Nueva",
        colores: ["ROBLE", "Oro", "roble"],
        precios: [
          { valores_ids: ["v-8x10"], precio: 100 },
          { valores_ids: ["v-85x11"], precio: 110 },
        ],
      },
      contexto,
      new Map([
        ["roble", "Roble"],
        ["oro", "Oro"],
      ]),
    );

    expect(payload.colores).toEqual(["Roble", "Oro"]);
    expect(payload.atributos_precio).toEqual([
      {
        atributo_id: "a-tamano",
        valores_ids: ["v-8x10", "v-85x11"],
      },
    ]);
    expect(payload.precios).toEqual([
      { valores_ids: ["v-8x10"], precio: 100 },
      { valores_ids: ["v-85x11"], precio: 110 },
    ]);
  });
});

describe("construirLogPreciosCsv", () => {
  it("incluye estado y errores", () => {
    const csv = `Producto;Tamaño de Marco;Precio nuevo
Moldura 004;8x10";140
Moldura 004;99x99";100
`;

    const preview = construirPrevisualizacionPreciosCsv(contexto, csv);
    const log = construirLogPreciosCsv(preview);

    expect(log).toContain("Actualizado");
    expect(log).toContain("Error");
    expect(log).toContain("99x99");
  });
});
