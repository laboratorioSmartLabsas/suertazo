import { useMemo, useSyncExternalStore } from "react";
import { esSuerte, type Suerte } from "./suerte";

export const CLAVE_HISTORIAL = "suertudo:historial";
export const MAXIMO_REGISTROS = 30;
const EVENTO_CAMBIO = "suertudo:historial-cambio";

function parsear(crudo: string | null): Suerte[] {
  if (!crudo) return [];
  try {
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? datos.filter(esSuerte) : [];
  } catch {
    return [];
  }
}

export function leerHistorial(): Suerte[] {
  try {
    return parsear(window.localStorage.getItem(CLAVE_HISTORIAL));
  } catch {
    return [];
  }
}

export function guardarHistorial(registros: Suerte[]): void {
  try {
    window.localStorage.setItem(
      CLAVE_HISTORIAL,
      JSON.stringify(registros.slice(0, MAXIMO_REGISTROS)),
    );
    window.dispatchEvent(new Event(EVENTO_CAMBIO));
  } catch {
    // Almacenamiento lleno o bloqueado: la app sigue funcionando sin persistir.
  }
}

function suscribir(notificar: () => void): () => void {
  window.addEventListener(EVENTO_CAMBIO, notificar);
  window.addEventListener("storage", notificar);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, notificar);
    window.removeEventListener("storage", notificar);
  };
}

function instantaneaCliente(): string {
  try {
    return window.localStorage.getItem(CLAVE_HISTORIAL) ?? "";
  } catch {
    return "";
  }
}

export function useHistorial(): Suerte[] | null {
  const crudo = useSyncExternalStore(suscribir, instantaneaCliente, () => undefined);
  return useMemo(() => (crudo === undefined ? null : parsear(crudo)), [crudo]);
}
