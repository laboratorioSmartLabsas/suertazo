import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { boletas, ordenes, sesiones, usuarios, type Usuario } from "@/db/schema";
import { hashToken, tokenSeguro } from "@/lib/codigos";

export const COOKIE_SESION = "suertazo_sesion";
export const COOKIE_COMPRAS = "suertazo_compras";
export const COOKIE_REFERIDO = "suertazo_ref";
export const COOKIE_VISTAS = "suertazo_vistas";
const DURACION_SESION_DIAS = 30;

export function cookieSegura(): boolean {
  if (process.env.APP_URL?.startsWith("http://")) return false;
  return process.env.NODE_ENV === "production";
}

export async function hashClave(clave: string): Promise<string> {
  return bcrypt.hash(clave, 11);
}

export async function verificarClave(clave: string, hash: string): Promise<boolean> {
  return bcrypt.compare(clave, hash);
}

export async function iniciarSesion(usuarioId: number): Promise<void> {
  const token = tokenSeguro();
  const expiraEn = new Date(Date.now() + DURACION_SESION_DIAS * 86_400_000);
  await db.insert(sesiones).values({ id: hashToken(token), usuarioId, expiraEn });
  await db.delete(sesiones).where(and(eq(sesiones.usuarioId, usuarioId), lt(sesiones.expiraEn, new Date())));
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: cookieSegura(),
    sameSite: "lax",
    path: "/",
    expires: expiraEn,
  });
}

export async function terminarSesion(): Promise<void> {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_SESION)?.value;
  if (token) await db.delete(sesiones).where(eq(sesiones.id, hashToken(token)));
  almacen.delete(COOKIE_SESION);
}

export type UsuarioSesion = Omit<Usuario, "passwordHash">;

export const obtenerUsuario = cache(async (): Promise<UsuarioSesion | null> => {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_SESION)?.value;
  if (!token) return null;
  const [fila] = await db
    .select({ usuario: usuarios })
    .from(sesiones)
    .innerJoin(usuarios, eq(usuarios.id, sesiones.usuarioId))
    .where(and(eq(sesiones.id, hashToken(token)), gt(sesiones.expiraEn, new Date())))
    .limit(1);
  if (!fila) return null;
  const { passwordHash: _omitido, ...usuario } = fila.usuario;
  void _omitido;
  return usuario;
});

export async function requerirUsuario(siguiente = "/cuenta"): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(`/ingresar?siguiente=${encodeURIComponent(siguiente)}`);
  return usuario;
}

export async function requerirAdmin(): Promise<UsuarioSesion> {
  const usuario = await requerirUsuario("/admin");
  if (usuario.rol !== "admin") redirect("/cuenta");
  return usuario;
}

export async function leerTokensCompra(): Promise<string[]> {
  const almacen = await cookies();
  const crudo = almacen.get(COOKIE_COMPRAS)?.value;
  if (!crudo) return [];
  return crudo.split(".").filter((t) => /^[A-Za-z0-9_-]{20,64}$/.test(t)).slice(-20);
}

export async function agregarTokenCompra(token: string): Promise<void> {
  const almacen = await cookies();
  const tokens = [...(await leerTokensCompra()), token].slice(-20);
  almacen.set(COOKIE_COMPRAS, tokens.join("."), {
    httpOnly: true,
    secure: cookieSegura(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

/**
 * Asienta en la cuenta las compras hechas como invitado: las que se hicieron desde este
 * navegador y las que se registraron con el mismo correo.
 */
export async function asentarComprasInvitado(usuario: { id: number; email: string }): Promise<number> {
  const tokens = await leerTokensCompra();
  const condiciones = [eq(ordenes.emailContacto, usuario.email)];
  if (tokens.length) condiciones.push(inArray(ordenes.tokenReclamo, tokens));
  const asentadas = await db
    .update(ordenes)
    .set({ usuarioId: usuario.id })
    .where(and(isNull(ordenes.usuarioId), or(...condiciones)))
    .returning({ id: ordenes.id });
  if (asentadas.length) {
    await db
      .update(boletas)
      .set({ usuarioId: usuario.id })
      .where(inArray(boletas.ordenId, asentadas.map((o) => o.id)));
  }
  return asentadas.length;
}
