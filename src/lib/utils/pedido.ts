export type SlaLevel = "ok" | "warning" | "danger";

export const RUTA_LABELS: Record<string, string> = {
  R1: "Impresión",
  R2: "Marcos",
  R3: "Books",
  R4: "Laminado",
};

export const SLA_LABELS: Record<SlaLevel, string> = {
  ok: "En tiempo",
  warning: "Próximo a vencer",
  danger: "Vencido",
};

const HORA_EN_MS = 24 * 60 * 60 * 1000;

export function getSlaLevel(fechaEntrega: string, horaEntrega: string): SlaLevel {
  const due = new Date(`${fechaEntrega}T${horaEntrega}`).getTime();
  const diffMs = due - Date.now();
  if (diffMs < 0) return "danger";
  if (diffMs < HORA_EN_MS) return "warning";
  return "ok";
}

export function getAgingLevel(time: string): SlaLevel {
  const diffMs = Date.now() - new Date(time).getTime();
  if (diffMs > 3 * HORA_EN_MS) return "danger";
  if (diffMs > HORA_EN_MS) return "warning";
  return "ok";
}

export function formatRelativeDue(
  fechaEntrega: string,
  horaEntrega: string,
): string {
  const due = new Date(`${fechaEntrega}T${horaEntrega}`).getTime();
  const diffMs = due - Date.now();
  const absMins = Math.floor(Math.abs(diffMs) / 60000);
  let txt: string;
  if (absMins < 60) txt = `${absMins} min`;
  else if (absMins < 1440) txt = `${Math.floor(absMins / 60)} h`;
  else txt = `${Math.floor(absMins / 1440)} d`;
  return diffMs < 0 ? `venció hace ${txt}` : `vence en ${txt}`;
}

export function getRutaLabel(ruta?: string | null): string {
  if (!ruta) return "";
  return RUTA_LABELS[ruta] || ruta;
}

export function elapsedFromTime(time: string): string {
  const diffMs = Date.now() - new Date(time).getTime();
  if (diffMs < 0) return "recién";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `${days} d`;
}

export function formatAttrs(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

export function formatFechaEntrega(
  fechaEntrega: string,
  horaEntrega: string,
  opciones?: Intl.DateTimeFormatOptions,
): string {
  return new Date(`${fechaEntrega}T${horaEntrega}`).toLocaleDateString(
    "es-MX",
    opciones ?? {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}
