import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buscarClienteFiscal } from "@/lib/services/clientesFiscales";
import { FormCliente } from "./FormCliente";

vi.mock("@/lib/services/pedidos", () => ({
  buscarClientes: vi.fn().mockResolvedValue([
    { nombre: "Ana López", telefono: "5551234567", email: "ana@correo.com" },
  ]),
}));

vi.mock("@/lib/services/clientesFiscales", () => ({
  buscarClienteFiscal: vi.fn(),
}));

function renderForm(overrides: Partial<ComponentProps<typeof FormCliente>> = {}) {
  const props: ComponentProps<typeof FormCliente> = {
    nombre: "",
    telefono: "",
    email: "",
    fechaEntrega: "",
    horaEntrega: "",
    requiereFactura: false,
    rfc: "",
    razonSocial: "",
    regimenFiscal: "",
    usoCfdi: "",
    cpFiscal: "",
    onNombreChange: vi.fn(),
    onTelefonoChange: vi.fn(),
    onEmailChange: vi.fn(),
    onFechaEntregaChange: vi.fn(),
    onHoraEntregaChange: vi.fn(),
    onRequiereFacturaChange: vi.fn(),
    onRfcChange: vi.fn(),
    onRazonSocialChange: vi.fn(),
    onRegimenFiscalChange: vi.fn(),
    onUsoCfdiChange: vi.fn(),
    onCpFiscalChange: vi.fn(),
    ...overrides,
  };

  return { props, ...render(<FormCliente {...props} />) };
}

describe("FormCliente", () => {
  beforeEach(() => {
    vi.mocked(buscarClienteFiscal).mockReset();
  });

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
    renderForm({
      fechaEntrega: "2026-05-15",
      onFechaEntregaChange,
    });

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
    renderForm({ onHoraEntregaChange });

    await user.click(screen.getByLabelText(/Hora de Entrega/i));
    await user.click(screen.getByRole("option", { name: "13:30" }));

    expect(onHoraEntregaChange).toHaveBeenCalledWith("13:30");
  });

  it("ajusta una hora guardada fuera del intervalo de media hora", () => {
    const onHoraEntregaChange = vi.fn();
    renderForm({ horaEntrega: "09:22", onHoraEntregaChange });

    expect(onHoraEntregaChange).toHaveBeenCalledWith("09:30");
  });

  it("muestra los campos fiscales al requerir factura", () => {
    renderForm({ requiereFactura: true });

    expect(screen.getByLabelText(/^RFC/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Razón social/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Régimen fiscal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Uso de CFDI/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CP fiscal/i)).toBeInTheDocument();
  });

  it("oculta los campos fiscales cuando no requiere factura", () => {
    renderForm();

    expect(screen.queryByLabelText(/^RFC/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Razón social/i)).not.toBeInTheDocument();
  });

  it("notifica el cambio del switch de factura", async () => {
    const user = userEvent.setup();
    const onRequiereFacturaChange = vi.fn();
    renderForm({ onRequiereFacturaChange });

    await user.click(screen.getByLabelText(/¿Requiere factura\?/i));

    expect(onRequiereFacturaChange).toHaveBeenCalledWith(true);
  });

  it("autocompleta los datos fiscales al seleccionar un cliente", async () => {
    const user = userEvent.setup();
    const onRequiereFacturaChange = vi.fn();
    const onRfcChange = vi.fn();
    const onRazonSocialChange = vi.fn();
    const onRegimenFiscalChange = vi.fn();
    const onUsoCfdiChange = vi.fn();
    const onCpFiscalChange = vi.fn();

    vi.mocked(buscarClienteFiscal).mockResolvedValue({
      id: "cf1",
      rfc: "ABC010101AB1",
      razon_social: "Ana López SA",
      regimen_fiscal: "612",
      uso_cfdi: "G03",
      cp_fiscal: "06450",
      email: "ana@correo.com",
      telefono: "5551234567",
    });

    renderForm({
      onRequiereFacturaChange,
      onRfcChange,
      onRazonSocialChange,
      onRegimenFiscalChange,
      onUsoCfdiChange,
      onCpFiscalChange,
    });

    fireEvent.change(screen.getByLabelText(/Teléfono/i), {
      target: { value: "55" },
    });
    const opcion = await screen.findByText("Ana López · 5551234567");
    await user.click(opcion);

    await waitFor(() => {
      expect(onRequiereFacturaChange).toHaveBeenCalledWith(true);
    });
    expect(onRfcChange).toHaveBeenCalledWith("ABC010101AB1");
    expect(onRazonSocialChange).toHaveBeenCalledWith("Ana López SA");
    expect(onRegimenFiscalChange).toHaveBeenCalledWith("612");
    expect(onUsoCfdiChange).toHaveBeenCalledWith("G03");
    expect(onCpFiscalChange).toHaveBeenCalledWith("06450");
  });
});
