import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ModalImportarValoresCsv } from "./ModalImportarValoresCsv";

const mockPrevisualizar = vi.hoisted(() => vi.fn());
const mockAplicar = vi.hoisted(() => vi.fn());

vi.mock("../catalogo/actions", () => ({
  previsualizarValoresCsv: mockPrevisualizar,
  aplicarValoresCsv: mockAplicar,
}));

const preview = {
  atributo: { id: "a-color", nombre: "Color marco" },
  filas: [{ fila: 2, valores: ["Plata"] }],
  errores: [],
  valores_nuevos: ["Plata"],
  valores_duplicados: [],
  payload: ["Plata"],
  resumen: {
    filas: 1,
    valores_nuevos: 1,
    valores_duplicados: 0,
    errores: 0,
  },
};

describe("ModalImportarValoresCsv", () => {
  it("previsualiza y aplica valores del atributo seleccionado", async () => {
    mockPrevisualizar.mockResolvedValue(preview);
    mockAplicar.mockResolvedValue({ valores_creados: 1, preview });

    const onApplied = vi.fn();

    render(
      <ModalImportarValoresCsv
        open
        atributoId="a-color"
        atributoNombre="Color marco"
        onClose={vi.fn()}
        onApplied={onApplied}
      />,
    );

    const archivo = new File(["Valor\nPlata"], "valores.csv", {
      type: "text/csv",
    });
    Object.defineProperty(archivo, "text", {
      value: vi.fn().mockResolvedValue("Valor\nPlata"),
    });

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [archivo] } });

    await waitFor(() => {
      expect(mockPrevisualizar).toHaveBeenCalledWith(
        "a-color",
        "Valor\nPlata",
      );
      expect(screen.getByText("Plata")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Aplicar valores/i }),
    );

    await waitFor(() => {
      expect(mockAplicar).toHaveBeenCalledWith(
        "a-color",
        "Valor\nPlata",
      );
      expect(onApplied).toHaveBeenCalled();
      expect(screen.getByText(/1 valor\(es\) nuevo\(s\)/i)).toBeInTheDocument();
    });
  });
});
