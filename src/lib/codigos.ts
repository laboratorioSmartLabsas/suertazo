import { createHash, randomBytes, randomInt } from "node:crypto";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function codigoAleatorio(longitud: number): string {
  let resultado = "";
  for (let i = 0; i < longitud; i++) resultado += ALFABETO[randomInt(ALFABETO.length)];
  return resultado;
}

export function tokenSeguro(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
