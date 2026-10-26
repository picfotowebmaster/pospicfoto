import { describe, expect, it } from "vitest";
import type { ProductoConAtributos } from "@/lib/supabase/types";
import {
  esTablaPreciosFaltante,
  firmaValores,
  generarCombinaciones,
  normalizarValoresIds,
  resolverPrecio,
} from "./precios";

const producto: Pick<ProductoConAtributos, "atributos" | "precios"> = {
  atributos: [
    {
      id: "a-tamano",
      nombre: "Impresión Tamaño",
      activo: true,
      afecta_precio: true,
      valores: [
        { id: "v-20x30", atributo_id: "a-tamano", valor: '20x30"' },
        { id: "v-24x36", atributo_id: "a-tamano", valor: '24x36"' },
      ],
    },
    {
      id: "a-correccion",
      nombre: "Corrección de Color",
      activo: true,
      afecta_precio: false,
      valores: [{ id: "v-si", atributo_id: "a-correccion", valor: "Si" }],
    },
  ],
  precios: [
    {
      id: "p-20x30",
      producto_id: "p1",
      valores_ids: ["v-20x30"],
      precio: 990,
      activo: true,
    },
    {
      id: "p-24x36",
      producto_id: "p1",
      valores_ids: ["v-24x36"],
      precio: 1430,
      activo: true,
    },
  ],
};

describe("resolverPrecio", () => {
  it("encuentra el precio por tamaño aunque otros atributos no afecten precio", () => {
    expect(
      resolverPrecio(producto, {
        "Impresión Tamaño": '20x30"',
        "Corrección de Color": "Si",
      }),
    ).toMatchObject({ precio: 990, completo: true });
  });

  it("devuelve incompleto si falta un atributo de precio", () => {
    expect(resolverPrecio(producto, { "Corrección de Color": "Si" })).toEqual({
      precio: null,
      completo: false,
      regla: null,
    });
  });

  it("devuelve completo sin regla si la variante no tiene precio", () => {
    const sinPrecio = {
      ...producto,
      precios: producto.precios.filter((p) => p.id !== "p-20x30"),
    };
    expect(
      resolverPrecio(sinPrecio, {
        "Impresión Tamaño": '20x30"',
      }),
    ).toEqual({ precio: null, completo: true, regla: null });
  });

  it("ignora reglas inactivas", () => {
    const inactivo = {
      ...producto,
      precios: [{ ...producto.precios[0], activo: false }],
    };
    expect(
      resolverPrecio(inactivo, { "Impresión Tamaño": '20x30"' }).precio,
    ).toBeNull();
  });

  it("resuelve combinaciones de dos atributos de precio", () => {
    const dosDimensiones: Pick<ProductoConAtributos, "atributos" | "precios"> = {
      atributos: [
        {
          id: "a-tamano",
          nombre: "Tamaño",
          activo: true,
          afecta_precio: true,
          valores: [{ id: "v-10", atributo_id: "a-tamano", valor: "10" }],
        },
        {
          id: "a-color",
          nombre: "Color",
          activo: true,
          afecta_precio: true,
          valores: [{ id: "v-negro", atributo_id: "a-color", valor: "Negro" }],
        },
      ],
      precios: [
        {
          id: "p-10-negro",
          producto_id: "p1",
          valores_ids: ["v-negro", "v-10"],
          precio: 250,
          activo: true,
        },
      ],
    };

    expect(
      resolverPrecio(dosDimensiones, { Tamaño: "10", Color: "Negro" }).precio,
    ).toBe(250);
  });
});

describe("detección de migración pendiente", () => {
  it("reconoce el error de tabla faltante de PostgREST", () => {
    expect(
      esTablaPreciosFaltante({
        code: "PGRST205",
        message:
          "Could not find the table 'public.producto_precios' in the schema cache",
      }),
    ).toBe(true);
    expect(esTablaPreciosFaltante(new Error("otro error"))).toBe(false);
  });
});

describe("utilidades de combinaciones", () => {
  it("normaliza y ordena ids", () => {
    expect(normalizarValoresIds(["b", "a", "b"])).toEqual(["a", "b"]);
    expect(firmaValores(["b", "a"])).toBe("a|b");
  });

  it("genera el producto cartesiano de valores", () => {
    const combinaciones = generarCombinaciones([
      {
        nombre: "Tamaño",
        valores: [
          { id: "v1", atributo_id: "a1", valor: "10" },
          { id: "v2", atributo_id: "a1", valor: "20" },
        ],
      },
      {
        nombre: "Color",
        valores: [{ id: "v3", atributo_id: "a2", valor: "Negro" }],
      },
    ]);

    expect(combinaciones).toHaveLength(2);
    expect(combinaciones.map((c) => c.map((v) => v.id))).toEqual([
      ["v1", "v3"],
      ["v2", "v3"],
    ]);
  });

  it("devuelve una combinación vacía sin atributos", () => {
    expect(generarCombinaciones([])).toEqual([[]]);
  });
});

describe("resolverPrecio con atributos múltiples de Photo Books", () => {
  const productoPhotoBook: Pick<ProductoConAtributos, "atributos" | "precios"> = {
    atributos: [
      {
        id: "pb-size",
        nombre: "Book Tamaño",
        activo: true,
        afecta_precio: true,
        valores: [{ id: "pb-8x10", atributo_id: "pb-size", valor: '8x10"' }],
      },
      {
        id: "pb-pages",
        nombre: "Hojas y Páginas",
        activo: true,
        afecta_precio: true,
        valores: [
          {
            id: "pb-10",
            atributo_id: "pb-pages",
            valor: "10 Hojas 20 Páginas",
          },
        ],
      },
      {
        id: "pb-extra",
        nombre: "Hoja Extra",
        activo: true,
        afecta_precio: true,
        valores: [{ id: "pb-none", atributo_id: "pb-extra", valor: "Ninguna" }],
      },
      {
        id: "pb-design",
        nombre: "Requiero Diseño",
        activo: true,
        afecta_precio: true,
        valores: [{ id: "pb-no", atributo_id: "pb-design", valor: "No" }],
      },
      {
        id: "pb-color",
        nombre: "Color Vinipiel",
        activo: true,
        afecta_precio: false,
        valores: [
          { id: "pb-negro", atributo_id: "pb-color", valor: "Negro" },
          { id: "pb-rojo", atributo_id: "pb-color", valor: "Rojo" },
        ],
      },
    ],
    precios: [
      {
        id: "pb-price",
        producto_id: "pb",
        valores_ids: ["pb-8x10", "pb-10", "pb-none", "pb-no"],
        precio: 1000,
        activo: true,
      },
    ],
  };

  it("resuelve con los 4 atributos de precio y no con el color", () => {
    const base = {
      "Book Tamaño": '8x10"',
      "Hojas y Páginas": "10 Hojas 20 Páginas",
      "Hoja Extra": "Ninguna",
      "Requiero Diseño": "No",
    };

    expect(
      resolverPrecio(productoPhotoBook, { ...base, "Color Vinipiel": "Negro" })
        .precio,
    ).toBe(1000);
    expect(
      resolverPrecio(productoPhotoBook, { ...base, "Color Vinipiel": "Rojo" })
        .precio,
    ).toBe(1000);
    expect(
      resolverPrecio(productoPhotoBook, {
        "Book Tamaño": '8x10"',
        "Color Vinipiel": "Negro",
      }).completo,
    ).toBe(false);
  });
});
