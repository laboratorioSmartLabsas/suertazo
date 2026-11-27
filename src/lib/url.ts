import { headers } from "next/headers";

const LOCAL = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/i;

function limpiar(valor: string | undefined): string | null {
  const texto = valor?.trim().replace(/\/+$/, "");
  if (!texto) return null;
  const conProtocolo = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;
  try {
    const url = new URL(conProtocolo);
    return LOCAL.test(url.hostname) ? null : url.origin;
  } catch {
    return null;
  }
}

/** URL pública sin consultar la petición: APP_URL válida o el dominio que Railway inyecta. */
export function urlPublicaEstatica(): string {
  return limpiar(process.env.APP_URL) ?? limpiar(process.env.RAILWAY_PUBLIC_DOMAIN) ?? limpiar(process.env.RAILWAY_STATIC_URL) ?? "http://localhost:4817";
}

/** URL pública para armar enlaces compartibles. Nunca devuelve localhost si la persona entra por un dominio real. */
export async function urlPublica(): Promise<string> {
  const configurada = limpiar(process.env.APP_URL) ?? limpiar(process.env.RAILWAY_PUBLIC_DOMAIN) ?? limpiar(process.env.RAILWAY_STATIC_URL);
  if (configurada) return configurada;
  const cabeceras = await headers();
  const host = (cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "").split(",")[0].trim();
  if (host && !LOCAL.test(host)) {
    const protocolo = (cabeceras.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
    return `${protocolo}://${host}`;
  }
  return urlPublicaEstatica();
}
