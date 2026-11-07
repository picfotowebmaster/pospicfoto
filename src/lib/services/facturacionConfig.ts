import type { EntidadEmisora } from "@/lib/supabase/types";

export interface ConfigFacturacionEntidad {
  url: string;
  urlCancelacion: string;
  usuario: string;
  password: string;
  regimenEmisor: string;
  cpExpedicion: string;
  serie: string;
}

function valorEnv(
  base: string,
  clave: string,
  fallback = "",
): string {
  const sufijo = clave && clave !== "PIC" ? `_${clave.toUpperCase()}` : "";
  return (
    process.env[`${base}${sufijo}`] ||
    process.env[base] ||
    fallback
  );
}

export function resolverConfigFacturacion(
  entidad?: Partial<EntidadEmisora> | null,
): ConfigFacturacionEntidad {
  const clave = (entidad?.facturacion_key || "PIC").toUpperCase();
  const codigo = (entidad?.codigo || clave)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_");

  return {
    url: valorEnv(
      "FACTUREMOSYA_URL",
      clave,
      "https://www.facturemosya.com/webservice/timbrarCfdi4_0.php",
    ),
    urlCancelacion: valorEnv(
      "FACTUREMOSYA_CANCELACION_URL",
      clave,
      "https://www.facturemosya.com/webservice/wsCancelarCFDI22.php",
    ),
    usuario: valorEnv("FACTUREMOSYA_USUARIO", clave, "democfdi"),
    password: valorEnv("FACTUREMOSYA_PASSWORD", clave, "demo2011"),
    regimenEmisor: valorEnv(
      "FACTUREMOSYA_REGIMEN_EMISOR",
      clave,
      "601",
    ),
    cpExpedicion:
      entidad?.cp_expedicion ||
      valorEnv("FACTUREMOSYA_CP_EXPEDICION", clave, "06010"),
    serie:
      process.env[`FACTUREMOSYA_SERIE_${codigo}`] ||
      (clave === "PIC" ? process.env[`FACTUREMOSYA_SERIE_${clave}`] : "") ||
      entidad?.serie_factura ||
      (clave === "PIC" ? process.env.FACTUREMOSYA_SERIE : "") ||
      "",
  };
}
