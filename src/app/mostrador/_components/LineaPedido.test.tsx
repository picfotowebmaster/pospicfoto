import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LineaPedido } from "./LineaPedido";
import type { Catalogo } from "@/lib/services/catalogo";
import type { LineaPedidoDraft } from "@/lib/supabase/types";

const catalogo: Catalogo = {
  categorias: [{ id: "c1", nombre: "Photo Books", orden: 0, activo: true }],
  productos: [
    {
      id: "p1",
      categoria_id: "c1",
      nombre: "Color Book Pasta Dura",
      ruta: "R3",
      orden: 0,
      activo: true,
      categoria_nombre: "Photo Books",
      atributos: [
        {
          id: "a1",
          nombre: "Book Tamaño",
          activo: true,
          valores: [{ id: "v1", atributo_id: "a1", valor: '8x10"' }],
        },
        {
          id: "a2",
          nombre: "Pasta Color",
          activo: true,
          valores: [{ id: "v2", atributo_id: "a2", valor: "Negro" }],
        },
      ],
    },
  ],
};

describe("LineaPedido (producto libre)", () => {
  it("solo muestra descripción, cantidad, precio y ruta; oculta buscador y atributos", () => {
    render(
      <LineaPedido
        id=""
        atributosPool={[]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        rutaDefault="R2"
      />,
    );

    expect(screen.queryByPlaceholderText(/Buscar producto/i)).toBeNull();
    expect(
      screen.getByPlaceholderText(/Nombre del producto o servicio/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cantidad/i)).toBeInTheDocument();
    expect(screen.getByText(/Precio Unitario/i)).toBeInTheDocument();
    expect(screen.queryByText(/Atributos/i)).toBeNull();
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("guarda la línea libre con producto_id y categoria_id nulos", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <LineaPedido
        id=""
        atributosPool={[]}
        onSave={onSave}
        onCancel={vi.fn()}
        rutaDefault="R2"
      />,
    );

    const guardar = screen.getByRole("button", { name: /Agregar Línea/i });
    expect(guardar).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText(/Nombre del producto o servicio/i),
      "Servicio express",
    );
    const inputs = screen.getAllByRole("spinbutton");
    await user.type(inputs[1], "150");

    expect(guardar).toBeEnabled();
    await user.click(guardar);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        producto_nombre: "Servicio express",
        precio_unitario: 150,
        ruta: "R2",
        categoria_id: null,
        producto_id: null,
      }),
    );
  });
});

describe("LineaPedido (remontaje al editar)", () => {
  const lineaA: LineaPedidoDraft = {
    id: "linea-a",
    producto_nombre: "Producto A",
    cantidad: 2,
    precio_unitario: 100,
    atributos: {},
    ruta: "R1",
    categoria_id: null,
    producto_id: null,
  };
  const lineaB: LineaPedidoDraft = {
    ...lineaA,
    id: "linea-b",
    producto_nombre: "Producto B",
    cantidad: 5,
    precio_unitario: 250,
  };

  it("abre en modo catálogo si la línea tiene categoria_id aunque falte producto_id", () => {
    render(
      <LineaPedido
        id="linea-c"
        atributosPool={[]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        rutaDefault="R1"
        catalogo={catalogo}
        editData={{
          id: "linea-c",
          producto_nombre: "Color Book Pasta Dura",
          cantidad: 1,
          precio_unitario: 100,
          atributos: {},
          ruta: "R3",
          categoria_id: "c1",
          producto_id: null,
        }}
      />,
    );

    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(/Categoría y producto/i)).toBeInTheDocument();
  });

  it("actualiza los campos al editar otra línea con distinta key", () => {
    const { rerender } = render(
      <LineaPedido
        key={lineaA.id}
        id={lineaA.id}
        atributosPool={[]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        rutaDefault="R1"
        editData={lineaA}
      />,
    );
    expect(
      screen.getByPlaceholderText(/Nombre del producto o servicio/i),
    ).toHaveValue("Producto A");

    rerender(
      <LineaPedido
        key={lineaB.id}
        id={lineaB.id}
        atributosPool={[]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        rutaDefault="R1"
        editData={lineaB}
      />,
    );

    expect(
      screen.getByPlaceholderText(/Nombre del producto o servicio/i),
    ).toHaveValue("Producto B");
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(5);
    expect(inputs[1]).toHaveValue(250);
  });
});

describe("LineaPedido (catálogo)", () => {
  it("exige elegir todas las opciones del producto antes de guardar", async () => {
    const user = userEvent.setup();
    render(
      <LineaPedido
        id=""
        atributosPool={[]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        rutaDefault="R3"
        catalogo={catalogo}
      />,
    );

    const guardar = screen.getByRole("button", { name: /Agregar Línea/i });
    expect(guardar).toBeDisabled();

    await user.selectOptions(screen.getAllByRole("combobox")[0], "c1");
    await user.selectOptions(screen.getAllByRole("combobox")[1], "p1");

    const combos = screen.getAllByRole("combobox");
    await user.selectOptions(combos[2], '8x10"');
    expect(guardar).toBeDisabled();

    await user.selectOptions(combos[3], "Negro");
    expect(guardar).toBeEnabled();
  });

  it("guarda la línea con los atributos elegidos", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <LineaPedido
        id=""
        atributosPool={[]}
        onSave={onSave}
        onCancel={vi.fn()}
        rutaDefault="R3"
        catalogo={catalogo}
      />,
    );

    await user.selectOptions(screen.getAllByRole("combobox")[0], "c1");
    await user.selectOptions(screen.getAllByRole("combobox")[1], "p1");
    const combos = screen.getAllByRole("combobox");
    await user.selectOptions(combos[2], '8x10"');
    await user.selectOptions(combos[3], "Negro");
    await user.click(screen.getByRole("button", { name: /Agregar Línea/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        producto_nombre: "Color Book Pasta Dura",
        categoria_id: "c1",
        producto_id: "p1",
        ruta: "R3",
        atributos: { "Book Tamaño": '8x10"', "Pasta Color": "Negro" },
      }),
    );
  });
});
