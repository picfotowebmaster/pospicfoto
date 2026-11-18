import { describe, it, expect, vi } from "vitest";
import {
  aplicarNombresVendedor,
  construirMapaNombres,
  idsVendedoresUnicos,
  resolverNombresVendedor,
} from "./vendedorTicket";

describe("idsVendedoresUnicos", () => {
  it("devuelve IDs únicos y omite nulos", () => {
    const ids = idsVendedoresUnicos([
      { cajero_id: "v1" },
      { cajero_id: "v2" },
      { cajero_id: "v1" },
      { cajero_id: null },
    ]);
    expect(ids).toEqual(["v1", "v2"]);
  });

  it("devuelve arreglo vacío si no hay vendedores", () => {
    expect(idsVendedoresUnicos([{ cajero_id: null }])).toEqual([]);
  });
});

describe("construirMapaNombres", () => {
  it("recorta espacios y convierte vacíos en null", () => {
    const mapa = construirMapaNombres([
      { id: "v1", nombre: "  Ana  " },
      { id: "v2", nombre: "   " },
      { id: "v3", nombre: null },
    ]);
    expect(mapa.get("v1")).toBe("Ana");
    expect(mapa.get("v2")).toBeNull();
    expect(mapa.get("v3")).toBeNull();
  });
});

describe("aplicarNombresVendedor", () => {
  const nombres = new Map([
    ["v1", "Ana"],
    ["v2", null],
  ]);

  it("asigna el nombre del perfil y deja null si no existe", () => {
    const pedidos = aplicarNombresVendedor(
      [
        { id: "p1", cajero_id: "v1" },
        { id: "p2", cajero_id: "v2" },
        { id: "p3", cajero_id: "v3" },
        { id: "p4", cajero_id: null },
      ],
      nombres,
    );

    expect(pedidos.map((pedido) => pedido.vendedor_nombre)).toEqual([
      "Ana",
      null,
      null,
      null,
    ]);
  });

  it("no modifica los pedidos originales", () => {
    const original = [{ id: "p1", cajero_id: "v1" }];
    aplicarNombresVendedor(original, nombres);
    expect(original[0]).not.toHaveProperty("vendedor_nombre");
  });
});

describe("resolverNombresVendedor", () => {
  it("no consulta perfiles cuando no hay vendedores", async () => {
    const consultar = vi.fn();
    const pedidos = [{ id: "p1", cajero_id: null }];

    const resultado = await resolverNombresVendedor(pedidos, consultar);

    expect(consultar).not.toHaveBeenCalled();
    expect(resultado).toEqual([
      { id: "p1", cajero_id: null, vendedor_nombre: null },
    ]);
  });

  it("consulta una sola vez con IDs únicos y aplica los nombres", async () => {
    const consultar = vi.fn().mockResolvedValue([{ id: "v1", nombre: "Ana" }]);
    const pedidos = [
      { id: "p1", cajero_id: "v1" },
      { id: "p2", cajero_id: "v1" },
    ];

    const resultado = await resolverNombresVendedor(pedidos, consultar);

    expect(consultar).toHaveBeenCalledWith(["v1"]);
    expect(resultado.map((pedido) => pedido.vendedor_nombre)).toEqual([
      "Ana",
      "Ana",
    ]);
  });
});
