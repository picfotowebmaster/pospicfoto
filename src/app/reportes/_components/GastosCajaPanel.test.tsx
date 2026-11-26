import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GastosCajaPanel } from "./GastosCajaPanel";
import type { GastoCaja } from "@/lib/supabase/types";

function gasto(overrides: Partial<GastoCaja> = {}): GastoCaja {
  return {
    id: "g1",
    sucursal_id: "suc-1",
    concepto: "Compra de tinta",
    categoria: "Insumos",
    monto: 30,
    fecha: "2026-11-10",
    registrado_por: "u1",
    registrado_por_nombre: "Jessica",
    created_at: "2026-11-10T15:00:00.000Z",
    anulado: false,
    ...overrides,
  };
}

function renderPanel(
  overrides: Partial<ComponentProps<typeof GastosCajaPanel>> = {},
) {
  const props = {
    gastos: [] as GastoCaja[],
    totalGastos: 0,
    cargando: false,
    error: null,
    puedeCrear: false,
    puedeAnular: false,
    sucursalFijaId: "suc-1" as string | null,
    sucursales: [],
    onCrear: vi.fn().mockResolvedValue(undefined),
    onAnular: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(<GastosCajaPanel {...props} />);
  return props;
}

describe("GastosCajaPanel", () => {
  it("expone labels accesibles y crea un gasto", async () => {
    const user = userEvent.setup();
    const { onCrear } = renderPanel({ puedeCrear: true });

    await user.click(screen.getByRole("button", { name: /Agregar gasto/i }));
    await user.type(screen.getByLabelText(/Concepto/i), "Compra de tinta");
    await user.type(screen.getByLabelText(/Monto/i), "30");
    await user.click(screen.getByRole("button", { name: /Guardar gasto/i }));

    await waitFor(() => expect(onCrear).toHaveBeenCalled());
    expect(onCrear).toHaveBeenCalledWith(
      expect.objectContaining({
        sucursal_id: "suc-1",
        concepto: "Compra de tinta",
        categoria: null,
        monto: 30,
      }),
    );
  });

  it("muestra el error de la anulación dentro del modal", async () => {
    const user = userEvent.setup();
    const onAnular = vi.fn().mockRejectedValue(new Error("fallo RPC"));
    renderPanel({
      gastos: [gasto()],
      totalGastos: 30,
      puedeAnular: true,
      onAnular,
    });

    await user.click(
      screen.getByRole("button", { name: /Anular gasto Compra de tinta/i }),
    );
    await user.click(screen.getByRole("button", { name: /^Anular$/i }));

    expect(await screen.findByText(/fallo RPC/i)).toBeInTheDocument();
    expect(onAnular).toHaveBeenCalledWith("g1");
  });

  it("oculta los anulados por defecto y los muestra con el toggle", async () => {
    const user = userEvent.setup();
    renderPanel({
      gastos: [gasto({ id: "g2", concepto: "Gasto anulado", anulado: true })],
      totalGastos: 0,
      puedeAnular: true,
    });

    expect(screen.queryByText("Gasto anulado")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Mostrar anulados/i));

    expect(screen.getByText("Gasto anulado")).toBeInTheDocument();
  });
});
