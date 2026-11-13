export function resolverBaseUrl(origen: string): string {
  const configurada = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = configurada || origen;
  return base.replace(/\/+$/, "");
}

export function urlTicketCompartido(origen: string, token: string): string {
  return `${resolverBaseUrl(origen)}/t/${token}`;
}
