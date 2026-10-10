import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/lib/supabase/client";
import { fetchCatalogo } from "./catalogo";

interface QbResult {
  data: unknown;
  error: unknown;
}

function builder(result: QbResult) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  for (const m of [
    "select",
    "eq",
    "neq",
    "in",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
  ]) {
    b[m] = vi.fn(chain);
  }
  b.then = (onFulfilled: (v: QbResult) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b;
}

const ATRIBUTOS = [
  {
    id: "at1",
    nombre: "Book Tamaño",
    activo: true,
    atributo_valores: [
      { id: "v1", atributo_id: "at1", valor: '8x10"' },
      { id: "v2", atributo_id: "at1", valor: '8.5x11" Horizontal' },
    ],
  },
  {
    id: "at2",
    nombre: "Pasta Color",
    activo: true,
    atributo_valores: [
      { id: "v4", atributo_id: "at2", valor: "Negro" },
      { id: "v5", atributo_id: "at2", valor: "Amarillo" },
    ],
  },
];

function mockTablas(pav: QbResult) {
  vi.mocked(supabase.from).mockImplementation((table: unknown) => {
    switch (table) {
      case "categorias":
        return builder({
          data: [{ id: "catPhoto", nombre: "Photo Books", orden: 0, activo: true }],
          error: null,
        }) as never;
      case "productos":
        return builder({
          data: [
            {
              id: "p1",
              categoria_id: "catPhoto",
              nombre: "Color Book Pasta Dura",
              ruta: "R3",
              orden: 0,
              activo: true,
            },
          ],
          error: null,
        }) as never;
      case "producto_atributos":
        return builder({
          data: [
            { id: "pa1", producto_id: "p1", atributo_id: "at1", orden: 0, requerido: true },
            { id: "pa2", producto_id: "p1", atributo_id: "at2", orden: 1, requerido: true },
          ],
          error: null,
        }) as never;
      case "atributos":
        return builder({ data: ATRIBUTOS, error: null }) as never;
      case "producto_atributo_valores":
        return builder(pav) as never;
      default:
        return builder({ data: [], error: null }) as never;
    }
  });
}

describe("fetchCatalogo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usa los valores por producto y su orden cuando existen", async () => {
    mockTablas({
      data: [
        {
          producto_atributo_id: "pa1",
          valor_id: "v1",
          orden: 0,
          atributo_valores: { id: "v1", atributo_id: "at1", valor: '8x10"' },
        },
        {
          producto_atributo_id: "pa1",
          valor_id: "v2",
          orden: 1,
          atributo_valores: { id: "v2", atributo_id: "at1", valor: '8.5x11" Horizontal' },
        },
      ],
      error: null,
    });

    const catalogo = await fetchCatalogo();
    const producto = catalogo.productos[0];

    expect(producto.atributos[0].nombre).toBe("Book Tamaño");
    expect(producto.atributos[0].valores.map((v) => v.valor)).toEqual([
      '8x10"',
      '8.5x11" Horizontal',
    ]);
  });

  it("cae al listado global (alfabético) cuando el atributo no tiene valores por producto", async () => {
    mockTablas({
      data: [
        {
          producto_atributo_id: "pa1",
          valor_id: "v2",
          orden: 0,
          atributo_valores: { id: "v2", atributo_id: "at1", valor: '8.5x11" Horizontal' },
        },
      ],
      error: null,
    });

    const catalogo = await fetchCatalogo();
    const producto = catalogo.productos[0];

    expect(producto.atributos[1].nombre).toBe("Pasta Color");
    expect(producto.atributos[1].valores.map((v) => v.valor)).toEqual([
      "Amarillo",
      "Negro",
    ]);
  });

  it("no rompe si la tabla producto_atributo_valores no existe (fallback global)", async () => {
    mockTablas({ data: null, error: { message: "relation does not exist" } });

    const catalogo = await fetchCatalogo();
    const producto = catalogo.productos[0];

    expect(producto.atributos[0].valores.map((v) => v.valor)).toEqual([
      '8.5x11" Horizontal',
      '8x10"',
    ]);
  });
});
