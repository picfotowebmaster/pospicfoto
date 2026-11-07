import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolverConfigFacturacion } from "./facturacionConfig";
import type { EntidadEmisora } from "@/lib/supabase/types";

const entornoOriginal = { ...process.env };

function entidad(overrides: Partial<EntidadEmisora>): EntidadEmisora {
  return {
    id: "e1",
    codigo: "PIC_CUB",
    nombre_comercial: "PIC PHOTO",
    razon_social: "PIC PHOTO",
    rfc: "PPH180924PK9",
    regimen_fiscal: "Régimen General Ley de Personas Morales",
    direccion: "Cuba",
    telefonos: null,
    email: null,
    sitio_web: null,
    logo_url: null,
    marca_id: null,
    sucursal_id: null,
    cp_expedicion: "06010",
    serie_factura: "PIC",
    facturacion_key: "PIC",
    activo: true,
    orden: 1,
    ...overrides,
  };
}

describe("resolverConfigFacturacion", () => {
  beforeEach(() => {
    process.env = { ...entornoOriginal };
    process.env.FACTUREMOSYA_USUARIO = "pic-user";
    process.env.FACTUREMOSYA_PASSWORD = "pic-pass";
    process.env.FACTUREMOSYA_SERIE = "GLOBAL";
  });

  afterEach(() => {
    process.env = { ...entornoOriginal };
  });

  it("usa las mismas credenciales para FRAMEX si no hay override", () => {
    const config = resolverConfigFacturacion(
      entidad({
        codigo: "FRX_CUB",
        facturacion_key: "FRX",
        serie_factura: "FRX",
      }),
    );

    expect(config.usuario).toBe("pic-user");
    expect(config.password).toBe("pic-pass");
  });

  it("respeta la serie de la entidad y no la serie global de PIC", () => {
    const config = resolverConfigFacturacion(
      entidad({ codigo: "PIC_PAL", serie_factura: "PAL", facturacion_key: "PIC" }),
    );

    expect(config.serie).toBe("PAL");
  });

  it("permite override de serie por código de entidad", () => {
    process.env.FACTUREMOSYA_SERIE_FRX_CUB = "FRX-2026";

    const config = resolverConfigFacturacion(
      entidad({
        codigo: "FRX_CUB",
        facturacion_key: "FRX",
        serie_factura: "FRX",
      }),
    );

    expect(config.serie).toBe("FRX-2026");
  });

  it("usa el CP de expedición de la entidad", () => {
    const config = resolverConfigFacturacion(
      entidad({ cp_expedicion: "06010" }),
    );

    expect(config.cpExpedicion).toBe("06010");
  });
});
