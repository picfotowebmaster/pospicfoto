import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ModalImportarPreciosCsv } from "./ModalImportarPreciosCsv";

const mockPrevisualizar = vi.hoisted(() => vi.fn());

vi.mock("../actions", () => ({
  previsualizarPreciosCsv: mockPrevisualizar,
  aplicarPreciosCsv: vi.fn(),
}));

const previewVacio = {
  categoria: { id: "cat-marcos", nombre: "Marcos" },
  filas: [],
  errores: [],
  resumen: {
    total_filas: 0,
    validas: 0,
    nuevas: 0,
    actualizadas: 0,
    sin_cambios: 0,
    errores: 0,
    productos_nuevos: 0,
    colores_nuevos: 0,
    precios_nuevos: 0,
  },
  filas_por_producto: [],
  productos_nuevos: [],
  colores_nuevos: [],
};

describe("ModalImportarPreciosCsv", () => {
  it("permite marcar crear productos antes de seleccionar el archivo", async () => {
    mockPrevisualizar.mockResolvedValue(previewVacio);

    render(
      <ModalImportarPreciosCsv
        open
        categoriaId="cat-marcos"
        categoriaNombre="Marcos"
        onClose={vi.fn()}
        onApplied={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.disabled).toBe(false);
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    const archivo = new File(["Producto;Tamaño;Color;Precio nuevo"], "precios.csv", {
      type: "text/csv",
    });
    Object.defineProperty(archivo, "text", {
      value: vi.fn().mockResolvedValue("Producto;Tamaño;Color;Precio nuevo"),
    });

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [archivo] } });

    await waitFor(() => {
      expect(mockPrevisualizar).toHaveBeenCalledWith(
        "cat-marcos",
        "Producto;Tamaño;Color;Precio nuevo",
        { crearProductosFaltantes: true },
      );
    });
  });
});
