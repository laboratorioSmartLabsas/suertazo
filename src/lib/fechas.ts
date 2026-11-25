export const ZONA_HORARIA = "America/Bogota";

export function hoyColombia(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

function aFechaUtc(fecha: string): Date {
  return new Date(`${fecha}T00:00:00Z`);
}

function aTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = aFechaUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return aTexto(d);
}

export function sumarMeses(fecha: string, meses: number): string {
  const d = aFechaUtc(fecha);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimoDia));
  return aTexto(d);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aFechaUtc(hasta).getTime() - aFechaUtc(desde).getTime()) / 86_400_000);
}

export function formatoFecha(fecha: string, conAño = true): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-CO", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(conAño ? { year: "numeric" } : {}),
  });
}

export function formatoFechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-CO", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatoFechaHora(fecha: Date | string): string {
  return new Date(fecha).toLocaleString("es-CO", {
    timeZone: ZONA_HORARIA,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
