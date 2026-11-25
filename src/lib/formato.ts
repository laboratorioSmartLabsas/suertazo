const pesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const numero = new Intl.NumberFormat("es-CO");

export function formatoPesos(valor: number): string {
  return pesos.format(valor);
}

export function formatoNumero(valor: number): string {
  return numero.format(valor);
}

export function formatoBoleta(valor: number, cifras: number): string {
  return String(valor).padStart(cifras, "0");
}

export function nombrePublico(nombre: string | null | undefined): string {
  if (!nombre) return "Titular por confirmar";
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[1].charAt(0).toUpperCase()}.`;
}

export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((parte / total) * 1000) / 10);
}
