import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModalLineaPedido } from "./ModalLineaPedido";
import type { LineaPedidoDraft } from "@/lib/supabase/types";

const linea: LineaPedidoDraft = {
  id: "linea-1",
  producto_nombre: "Producto agregado",
  cantidad: 2,
  precio_unitario: 125,
  atributos: {},
  ruta: "R1",
  categoria_id: null,
  producto_id: null,
};

describe("ModalLineaPedido", () => {
  it("muestra el formulario de edición con los datos de la línea", () => {
    render(
      <ModalLineaPedido
        open
        atributosPool={[]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        editData={linea}
        rutaDefault="R1"
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Editar producto" })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Nombre del producto o servicio/i),
    ).toHaveValue("Producto agregado");
    expect(screen.getByRole("button", { name: /Actualizar Línea/i })).toBeInTheDocument();
  });

  it("cierra el modal con Escape o al pulsar fuera", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { rerender } = render(
      <ModalLineaPedido
        open
        atributosPool={[]}
        onSave={vi.fn()}
        onCancel={onCancel}
        rutaDefault="R1"
      />,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);

    onCancel.mockClear();
    rerender(
      <ModalLineaPedido
        open
        atributosPool={[]}
        onSave={vi.fn()}
        onCancel={onCancel}
        rutaDefault="R1"
      />,
    );
    await user.click(screen.getByRole("dialog").parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
