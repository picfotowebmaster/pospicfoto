export const CODIGOS_ERROR_FACTUREMOSYA: Record<string, string> = {
  "200": "Fallo general del sistema.",
  "301": "Usuario o contraseña incorrectos.",
  "302": "El usuario no es correcto.",
  "303": "Error al validar la contraseña.",
  "304": "El documento está vacío o su formato es erróneo (debe ser texto).",
  "305": "Error en la validación del esquema.",
  "306": "El atributo UUID está vacío o es erróneo.",
  "307": "El atributo versión está vacío o es erróneo.",
  "308": "El atributo folio está vacío o es erróneo.",
  "309": "El atributo fecha está vacío o es erróneo.",
  "310": "El atributo tipo de comprobante está vacío o es erróneo.",
  "311": "El atributo número de certificado está vacío o es erróneo.",
  "312": "El atributo total está vacío o es erróneo.",
  "313": "El atributo subtotal está vacío o es erróneo.",
  "314": "No existe el usuario y contraseña para el timbrado.",
  "315": "El documento XML no se pudo formar con éxito.",
  "316": "El total no corresponde con los importes de los conceptos e impuestos.",
  "317": "Ya existe un documento con el folio y serie indicados.",
  "320":
    "El certificado (CSD) del emisor no estaba vigente a la fecha de emisión o es apócrifo. Renueva o verifica el CSD en FacturemosYa.",
};

const CREDENCIALES = new Set(["301", "302", "303", "314"]);

function limpiar(valor?: string): string {
  return (valor ?? "").trim();
}

export function formatearErrorFacturemosya(
  codigo: string,
  descripcion?: string,
): string {
  const clave = limpiar(codigo);
  const detalle = limpiar(descripcion);

  if (!clave || clave === "201") {
    return detalle || "Respuesta inesperada de FacturemosYa (sin código ni descripción).";
  }

  const mensaje = CODIGOS_ERROR_FACTUREMOSYA[clave];
  if (mensaje) {
    if (CREDENCIALES.has(clave)) {
      return `${mensaje} Revisa las credenciales en .env.local.`;
    }
    if (clave === "305" || clave === "316" || clave === "317") {
      return detalle ? `${mensaje} ${detalle}` : mensaje;
    }
    return mensaje;
  }

  // 501+ (PAC) y códigos no listados: se devuelve la descripción del PAC/SAT.
  return detalle || `Código ${clave}`;
}

export const CODIGOS_ERROR_CANCELACION: Record<string, string> = {
  "2001": "La cancelación quedó en espera de aceptación por el receptor.",
  CANC102:
    "El CFDI no se puede cancelar porque tiene comprobantes relacionados vigentes.",
  CANC103: "El CFDI ya fue cancelado previamente (por aceptación del receptor).",
  CANC104: "El CFDI no se puede cancelar porque fue rechazado previamente.",
  CANC105: "El CFDI tiene estatus de 'En espera de aceptación'.",
  CANC106: "El CFDI tiene estatus de 'En proceso'.",
  CANC107: "El CFDI ya fue cancelado previamente (por plazo vencido).",
  CANC999: "Error no clasificado.",
  "101": "Error no clasificado.",
  "203": "El UUID no corresponde al RFC del emisor.",
  "204": "El UUID no es aplicable para cancelación.",
  "205": "El UUID no existe.",
  "301": "Usuario o contraseña incorrectos.",
  "302": "El usuario es incorrecto.",
  "303": "Error al validar la contraseña.",
  "304": "El UUID es requerido o erróneo (formato UUID válido).",
  "305": "Motivo de cancelación no válido.",
  "306": "Debe proporcionar el UUID relacionado (motivo 01).",
  "307": "No debe proporcionar el UUID relacionado para este motivo.",
  "320":
    "El certificado (CSD) del emisor no estaba vigente a la fecha de cancelación o es apócrifo. Renueva o verifica el CSD en FacturemosYa.",
};

const CREDENCIALES_CANCELACION = new Set(["301", "302", "303"]);

export function formatearErrorCancelacion(
  codigo: string,
  descripcion?: string,
): string {
  const clave = limpiar(codigo);
  const detalle = limpiar(descripcion);

  if (!clave || clave === "201") {
    return detalle || "Respuesta inesperada de FacturemosYa (sin código ni descripción).";
  }

  const mensaje = CODIGOS_ERROR_CANCELACION[clave];
  if (mensaje) {
    if (CREDENCIALES_CANCELACION.has(clave)) {
      return `${mensaje} Revisa las credenciales en .env.local.`;
    }
    return mensaje;
  }

  return detalle || `Código ${clave}`;
}
