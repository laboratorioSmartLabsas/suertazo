import { eq } from "drizzle-orm";
import * as webpush from "web-push";
import { db, type Tx } from "@/db";
import { notificaciones, suscripcionesPush, usuarios } from "@/db/schema";

export type NuevaNotificacion = {
  usuarioId: number | null;
  tipo: "resultado" | "sistema" | "compra" | "comision" | "retiro" | "admin";
  titulo: string;
  mensaje: string;
  enlace?: string | null;
};

export async function crearNotificaciones(tx: Tx | typeof db, lista: NuevaNotificacion[]) {
  if (!lista.length) return;
  await tx.insert(notificaciones).values(lista.map((n) => ({ ...n, enlace: n.enlace ?? null })));
}

export async function notificarAdmins(
  tx: Tx | typeof db,
  datos: Omit<NuevaNotificacion, "usuarioId" | "tipo">,
): Promise<NuevaNotificacion[]> {
  const admins = await tx.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.rol, "admin"));
  const lista = admins.map((a) => ({ ...datos, usuarioId: a.id, tipo: "admin" as const }));
  await crearNotificaciones(tx, lista);
  return lista;
}

export function pushConfigurado(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let vapidListo = false;
function configurarVapid() {
  if (vapidListo || !pushConfigurado()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:soporte@suertazo.co",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidListo = true;
}

/** Envía las notificaciones como push del navegador. Nunca lanza: el push es complementario. */
export async function enviarPush(lista: NuevaNotificacion[]): Promise<void> {
  if (!pushConfigurado() || !lista.length) return;
  configurarVapid();
  try {
    for (const n of lista) {
      const destinos =
        n.usuarioId === null
          ? await db.select().from(suscripcionesPush)
          : await db.select().from(suscripcionesPush).where(eq(suscripcionesPush.usuarioId, n.usuarioId));
      const carga = JSON.stringify({ titulo: n.titulo, mensaje: n.mensaje, enlace: n.enlace ?? "/" });
      await Promise.all(
        destinos.map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, {
              TTL: 60 * 60 * 24,
            });
          } catch (error) {
            const codigo = (error as { statusCode?: number }).statusCode;
            if (codigo === 404 || codigo === 410) {
              await db.delete(suscripcionesPush).where(eq(suscripcionesPush.id, s.id));
            }
          }
        }),
      );
    }
  } catch {
    // Un fallo del servicio push no debe afectar la operación principal.
  }
}

