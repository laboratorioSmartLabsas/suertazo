"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ordenes, usuarios } from "@/db/schema";
import {
  asentarComprasInvitado,
  COOKIE_REFERIDO,
  hashClave,
  iniciarSesion,
  leerTokensCompra,
  terminarSesion,
  verificarClave,
} from "@/lib/auth";
import { codigoAleatorio } from "@/lib/codigos";
import { crearNotificaciones } from "@/lib/notificaciones";
import type { EstadoAccion } from "./tipos";

function destinoSeguro(valor: FormDataEntryValue | null, porDefecto: string): string {
  const texto = typeof valor === "string" ? valor : "";
  return texto.startsWith("/") && !texto.startsWith("//") ? texto : porDefecto;
}

const esquemaRegistro = z
  .object({
    nombre: z.string().trim().min(3, "Escribe tu nombre completo.").max(80),
    email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
    telefono: z
      .string()
      .trim()
      .regex(/^[0-9+\s-]{7,20}$/, "Escribe un celular válido."),
    clave: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
    confirmacion: z.string(),
    terminos: z.literal("on", { message: "Debes aceptar los términos y condiciones." }),
  })
  .refine((d) => d.clave === d.confirmacion, { message: "Las contraseñas no coinciden.", path: ["confirmacion"] });

async function generarCodigoUnico(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const codigo = codigoAleatorio(7);
    const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.codigoReferido, codigo)).limit(1);
    if (!existe) return codigo;
  }
  throw new Error("No se pudo generar un código de referido.");
}

export async function registrarse(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const datos = esquemaRegistro.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  const { nombre, email, telefono, clave } = datos.data;

  const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email)).limit(1);
  if (existe) return { error: "Ya existe una cuenta con ese correo. Inicia sesión." };

  const almacen = await cookies();
  let referidoPorId: number | null = null;
  const codigoRef = almacen.get(COOKIE_REFERIDO)?.value;
  if (codigoRef) {
    const [ref] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.codigoReferido, codigoRef)).limit(1);
    referidoPorId = ref?.id ?? null;
  }
  if (!referidoPorId) {
    const tokens = await leerTokensCompra();
    if (tokens.length) {
      const [orden] = await db
        .select({ referidorId: ordenes.referidorId })
        .from(ordenes)
        .where(and(inArray(ordenes.tokenReclamo, tokens), isNotNull(ordenes.referidorId)))
        .limit(1);
      referidoPorId = orden?.referidorId ?? null;
    }
  }

  const [nuevo] = await db
    .insert(usuarios)
    .values({
      nombre,
      email,
      telefono,
      passwordHash: await hashClave(clave),
      codigoReferido: await generarCodigoUnico(),
      referidoPorId,
    })
    .returning();

  await iniciarSesion(nuevo.id);
  const asentadas = await asentarComprasInvitado(nuevo);
  await crearNotificaciones(db, [
    {
      usuarioId: nuevo.id,
      tipo: "sistema",
      titulo: `¡Bienvenido a Suertazo, ${nombre.split(" ")[0]}!`,
      mensaje: asentadas
        ? `Asentamos ${asentadas} ${asentadas === 1 ? "compra" : "compras"} en tu cuenta. Te avisaremos cuando confirmemos el pago.`
        : "Ya puedes comprar boletas y compartir tu link de referido para ganar comisiones.",
      enlace: "/cuenta",
    },
  ]);
  almacen.delete(COOKIE_REFERIDO);
  redirect(destinoSeguro(formData.get("siguiente"), "/cuenta"));
}

const esquemaIngreso = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  clave: z.string().min(1, "Escribe tu contraseña."),
});

export async function ingresar(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const datos = esquemaIngreso.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, datos.data.email)).limit(1);
  if (!usuario || !(await verificarClave(datos.data.clave, usuario.passwordHash))) {
    return { error: "Correo o contraseña incorrectos." };
  }
  await iniciarSesion(usuario.id);
  await asentarComprasInvitado(usuario);
  redirect(destinoSeguro(formData.get("siguiente"), usuario.rol === "admin" ? "/admin" : "/cuenta"));
}

export async function salir(): Promise<void> {
  await terminarSesion();
  redirect("/");
}
