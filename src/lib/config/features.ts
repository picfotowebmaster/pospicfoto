export function facturacionHabilitada(): boolean {
  return process.env.NEXT_PUBLIC_FACTURACION_HABILITADA === "true";
}

export const MENSAJE_FACTURACION_DESHABILITADA =
  "La facturación está temporalmente deshabilitada.";
