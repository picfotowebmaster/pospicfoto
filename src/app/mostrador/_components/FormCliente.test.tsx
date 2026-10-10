import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormCliente } from "./FormCliente";

function renderForm(horaEntrega = "", onHoraEntregaChange = vi.fn()) {
  return {
    onHoraEntregaChange,
    ...render(
      <FormCliente
        nombre=""
        telefono=""
        email=""
        fechaEntrega=""
        horaEntrega={horaEntrega}
        onNombreChange={vi.fn()}
        onTelefonoChange={vi.fn()}
        onEmailChange={vi.fn()}
        onFechaEntregaChange={vi.fn()}
        onHoraEntregaChange={onHoraEntregaChange}
      />,
    ),
  };
}

describe("FormCliente", () => {
  it("muestra el calendario y las horas en español", () => {
    renderForm();

    expect(screen.getByLabelText(/Fecha de Entrega/i)).toHaveAttribute(
      "placeholder",
      "Seleccionar fecha...",
    );
    expect(screen.getByLabelText(/Hora de Entrega/i)).toHaveAttribute(
      "placeholder",
      "Seleccionar hora...",
    );
  });

  it("guarda la fecha elegida en el formato ISO del pedido", async () => {
    const user = userEvent.setup();
    const onFechaEntregaChange = vi.fn();
    render(
      <FormCliente
        nombre=""
        telefono=""
        email=""
        fechaEntrega="2026-05-15"
        horaEntrega=""
        onNombreChange={vi.fn()}
        onTelefonoChange={vi.fn()}
        onEmailChange={vi.fn()}
        onFechaEntregaChange={onFechaEntregaChange}
        onHoraEntregaChange={vi.fn()}
      />,
    );

    const fecha = screen.getByLabelText(/Fecha de Entrega/i);
    expect(fecha).toHaveValue("15/05/2026");
    await user.click(fecha);
    const siguienteDia = document.querySelector(
      ".react-datepicker__day--016:not(.react-datepicker__day--outside-month)",
    );
    expect(siguienteDia).not.toBeNull();
    await user.click(siguienteDia!);

    expect(onFechaEntregaChange).toHaveBeenCalledWith("2026-05-16");
  });

  it("permite elegir una hora en intervalos de media hora", async () => {
    const user = userEvent.setup();
    const onHoraEntregaChange = vi.fn();
    renderForm("", onHoraEntregaChange);

    await user.click(screen.getByLabelText(/Hora de Entrega/i));
    await user.click(screen.getByRole("option", { name: "13:30" }));

    expect(onHoraEntregaChange).toHaveBeenCalledWith("13:30");
  });

  it("ajusta una hora guardada fuera del intervalo de media hora", () => {
    const onHoraEntregaChange = vi.fn();
    renderForm("09:22", onHoraEntregaChange);

    expect(onHoraEntregaChange).toHaveBeenCalledWith("09:30");
  });
});
