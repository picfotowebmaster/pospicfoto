const PATRONES_VERSION_DESACTUALIZADA = [
  /server action .*was not found on the server/i,
  /failed to find server action/i,
];

export function esVersionDesactualizada(error: unknown): boolean {
  const mensaje = error instanceof Error ? error.message : String(error ?? "");
  return PATRONES_VERSION_DESACTUALIZADA.some((patron) =>
    patron.test(mensaje),
  );
}

export function mensajeErrorUsuario(
  error: unknown,
  mensajePorDefecto: string,
): string {
  if (esVersionDesactualizada(error)) {
    return "La aplicación se actualizó. Recarga la página e intenta de nuevo.";
  }

  return error instanceof Error ? error.message : mensajePorDefecto;
}
