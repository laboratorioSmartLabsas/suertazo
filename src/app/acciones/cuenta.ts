"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { retiros, suscripcionesPush, usuarios } from "@/db/schema";
import { COOKIE_VISTAS, cookieSegura, hashClave, obtenerUsuario, requerirUsuario, verificarClave } from "@/lib/auth";
import { formatoPesos } from "@/lib/formato";
import { enviarPush, notificarAdmins } from "@/lib/notificaciones";
import { obtenerAjustes, saldoBilletera } from "@/lib/rifas";
import type { EstadoAccion } from "./tipos";


const esquemaPerfil = z.object({
  nombre: z.string().trim().min(3, "Escribe tu nombre completo.").max(80),
  telefono: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{7,20}$/, "Escribe un celular válido."),
  documento: z.string().trim().max(20).optional(),
});

export async function actualizarPerfil(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const usuario = await requerirUsuario("/cuenta/perfil");
  const datos = esquemaPerfil.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  await db
    .update(usuarios)
    .set({ nombre: datos.data.nombre, telefono: datos.data.telefono, documento: datos.data.documento || null })
    .where(eq(usuarios.id, usuario.id));
  revalidatePath("/cuenta", "layout");
  return { ok: true, mensaje: "Perfil actualizado." };
}

export async function cambiarClave(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirUsuario("/cuenta/perfil");
  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");
  if (nueva.length < 8 || nueva.length > 72) return { error: "La nueva contraseña debe tener entre 8 y 72 caracteres." };
  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, sesion.id)).limit(1);
  if (!(await verificarClave(actual, usuario.passwordHash))) return { error: "La contraseña actual no es correcta." };
  await db.update(usuarios).set({ passwordHash: await hashClave(nueva) }).where(eq(usuarios.id, usuario.id));
  return { ok: true, mensaje: "Contraseña actualizada." };
}

export async function solicitarRetiro(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const usuario = await requerirUsuario("/cuenta/billetera");
  const monto = Math.floor(Number(formData.get("monto")));
  const datosPago = String(formData.get("datosPago") ?? "").trim();
  if (!Number.isFinite(monto) || monto <= 0) return { error: "Escribe un monto válido." };
  if (datosPago.length < 8 || datosPago.length > 300) {
    return { error: "Indica banco o billetera, tipo y número de cuenta, y el titular." };
  }
  const config = await obtenerAjustes();
  if (monto < config.retiroMinimo) return { error: `El retiro mínimo es de ${formatoPesos(config.retiroMinimo)}.` };

  const resultado = await db.transaction(async (tx) => {
    await tx.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, usuario.id)).for("update");
    const saldo = await saldoBilletera(usuario.id, tx);
    if (monto > saldo.disponible) return { error: `Tu saldo disponible es ${formatoPesos(saldo.disponible)}.` };
    await tx.insert(retiros).values({ usuarioId: usuario.id, monto, datosPago });
    return null;
  });
  if (resultado) return resultado;

  const avisos = await notificarAdmins(db, {
    titulo: "Nueva solicitud de retiro",
    mensaje: `${usuario.nombre} solicitó retirar ${formatoPesos(monto)} de sus comisiones.`,
    enlace: "/admin/comisiones",
  });
  await enviarPush(avisos);
  revalidatePath("/cuenta/billetera");
  return { ok: true, mensaje: "Solicitud de retiro enviada. Te avisaremos cuando se realice el pago." };
}

export async function marcarNotificacionesVistas(): Promise<void> {
  const usuario = await obtenerUsuario();
  if (usuario) {
    await db.update(usuarios).set({ notificacionesVistasEn: new Date() }).where(eq(usuarios.id, usuario.id));
  } else {
    const almacen = await cookies();
    almacen.set(COOKIE_VISTAS, new Date().toISOString(), {
      httpOnly: true,
      secure: cookieSegura(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  revalidatePath("/", "layout");
}

const esquemaSuscripcion = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function guardarSuscripcionPush(suscripcion: unknown): Promise<{ ok: boolean }> {
  const datos = esquemaSuscripcion.safeParse(suscripcion);
  if (!datos.success) return { ok: false };
  const usuario = await obtenerUsuario();
  await db
    .insert(suscripcionesPush)
    .values({
      usuarioId: usuario?.id ?? null,
      endpoint: datos.data.endpoint,
      p256dh: datos.data.keys.p256dh,
      auth: datos.data.keys.auth,
    })
    .onConflictDoUpdate({
      target: suscripcionesPush.endpoint,
      set: { usuarioId: usuario?.id ?? null, p256dh: datos.data.keys.p256dh, auth: datos.data.keys.auth },
    });
  return { ok: true };
}
