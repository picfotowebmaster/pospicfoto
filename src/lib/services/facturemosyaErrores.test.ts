import { describe, it, expect } from "vitest";
import { formatearErrorFacturemosya, formatearErrorCancelacion } from "./facturemosyaErrores";

describe("formatearErrorFacturemosya", () => {
  it("devuelve mensaje de credenciales con sugerencia", () => {
    const msg = formatearErrorFacturemosya("301");
    expect(msg).toContain("Usuario o contraseña incorrectos");
    expect(msg).toContain(".env.local");
  });

  it("mapea error de folio duplicado", () => {
    expect(formatearErrorFacturemosya("317")).toBe(
      "Ya existe un documento con el folio y serie indicados.",
    );
  });

  it("agrega el detalle en errores de esquema (305)", () => {
    const msg = formatearErrorFacturemosya("305", "elemento X incorrecto");
    expect(msg).toContain("Error en la validación del esquema");
    expect(msg).toContain("elemento X incorrecto");
  });

  it("agrega el detalle en error de totales (316)", () => {
    const msg = formatearErrorFacturemosya("316", "diferencia de 1.00");
    expect(msg).toContain("no corresponde");
    expect(msg).toContain("diferencia de 1.00");
  });

  it("devuelve la descripción del PAC para códigos 501+", () => {
    const msg = formatearErrorFacturemosya(
      "600",
      "301 CFDI40142 La clave del campo RegimenFiscal debe corresponder",
    );
    expect(msg).toBe(
      "301 CFDI40142 La clave del campo RegimenFiscal debe corresponder",
    );
  });

  it("devuelve el código cuando no hay descripción", () => {
    expect(formatearErrorFacturemosya("999")).toBe("Código 999");
  });

  it("devuelve descripción si no hay código pero sí detalle", () => {
    expect(formatearErrorFacturemosya("", "fallo raro")).toBe("fallo raro");
  });
});

describe("formatearErrorCancelacion", () => {
  it("devuelve el detalle cuando el código es 201", () => {
    expect(formatearErrorCancelacion("201", "Factura cancelada")).toBe(
      "Factura cancelada",
    );
  });

  it("mapea espera de aceptación", () => {
    expect(formatearErrorCancelacion("2001")).toContain("espera de aceptación");
  });

  it("mapea códigos CANC del PAC", () => {
    expect(formatearErrorCancelacion("CANC102")).toContain(
      "comprobantes relacionados",
    );
  });

  it("mapea motivo inválido", () => {
    expect(formatearErrorCancelacion("305")).toBe(
      "Motivo de cancelación no válido.",
    );
  });

  it("mapea uuid relacionado requerido", () => {
    expect(formatearErrorCancelacion("306")).toContain("UUID relacionado");
  });

  it("agrega sugerencia en errores de credenciales", () => {
    expect(formatearErrorCancelacion("301")).toContain(".env.local");
  });

  it("devuelve el detalle del PAC para códigos no listados", () => {
    expect(formatearErrorCancelacion("999", "error del PAC")).toBe(
      "error del PAC",
    );
  });
});
