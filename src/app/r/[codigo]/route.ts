import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { COOKIE_REFERIDO, cookieSegura } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const limpio = codigo.toUpperCase();
  const destino = new URL("/", request.url);
  const respuesta = NextResponse.redirect(destino);
  if (!/^[A-Z0-9]{5,10}$/.test(limpio)) return respuesta;
  const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.codigoReferido, limpio)).limit(1);
  if (existe) {
    respuesta.cookies.set(COOKIE_REFERIDO, limpio, {
      httpOnly: true,
      secure: cookieSegura(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  }
  return respuesta;
}
