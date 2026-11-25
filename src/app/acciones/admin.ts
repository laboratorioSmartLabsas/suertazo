"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ajustes, boletas, loterias, premios, retiros, rifas, sorteos, usuarios } from "@/db/schema";
import { requerirAdmin } from "@/lib/auth";
import { formatoPesos } from "@/lib/formato";
import { crearNotificaciones, enviarPush } from "@/lib/notificaciones";
import { activarCuentaRegresiva, aprobarOrden, publicarResultado, rechazarOrden } from "@/lib/rifas";
import type { EstadoAccion } from "./tipos";

function aResultado(r: { ok: true; mensaje?: string } | { ok: false; error: string }): EstadoAccion {
  return r.ok ? { ok: true, mensaje: r.mensaje } : { error: r.error };
}

export async function aprobarOrdenAccion(ordenId: number, _previo: EstadoAccion): Promise<EstadoAccion> {
  const admin = await requerirAdmin();
  const r = await aprobarOrden(ordenId, admin.id);
  revalidatePath("/admin", "layout");
  return aResultado(r);
}

export async function rechazarOrdenAccion(ordenId: number, _previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const admin = await requerirAdmin();
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 300) || null;
  const r = await rechazarOrden(ordenId, admin.id, nota);
  revalidatePath("/admin", "layout");
  return aResultado(r);
}

const urlOpcional = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\//.test(v), "Los enlaces deben empezar por https://")
  .transform((v) => v || null);

const esquemaRifa = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre de la rifa.").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El identificador solo admite letras minúsculas, números y guiones."),
  descripcion: z.string().trim().min(10, "Escribe una descripción.").max(2000),
  imagenUrl: urlOpcional,
  linkPago: urlOpcional,
  precioBoleta: z.coerce.number().int().min(1000, "El precio mínimo es $1.000."),
  valorCuota: z.coerce.number().int().min(0),
  cifras: z.coerce.number().int().min(2).max(5),
  porcentajePreventa: z.coerce.number().int().min(1).max(100),
  mesesEspera: z.coerce.number().int().min(0).max(12),
  diasSorteo: z.coerce.number().int().min(0).max(1000),
  premioDiario: z.coerce.number().int().min(0),
  estado: z.enum(["borrador", "activa", "finalizada"]),
});

export async function guardarRifa(rifaId: number | null, _previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirAdmin();
  const datos = esquemaRifa.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  if (datos.data.valorCuota > datos.data.precioBoleta) return { error: "La cuota no puede ser mayor que el precio de la boleta." };

  const [duplicada] = await db
    .select({ id: rifas.id })
    .from(rifas)
    .where(rifaId ? and(eq(rifas.slug, datos.data.slug), ne(rifas.id, rifaId)) : eq(rifas.slug, datos.data.slug))
    .limit(1);
  if (duplicada) return { error: "Ya existe una rifa con ese identificador." };

  if (rifaId) {
    const [actual] = await db.select().from(rifas).where(eq(rifas.id, rifaId)).limit(1);
    if (!actual) return { error: "La rifa no existe." };
    const [{ vendidas }] = await db
      .select({ vendidas: sql<number>`count(*)::int` })
      .from(boletas)
      .where(eq(boletas.rifaId, rifaId));
    if (vendidas > 0 && datos.data.cifras !== actual.cifras) {
      return { error: "No puedes cambiar la cantidad de cifras cuando ya hay boletas vendidas." };
    }
    await db.update(rifas).set(datos.data).where(eq(rifas.id, rifaId));
    revalidatePath("/", "layout");
    return { ok: true, mensaje: "Rifa actualizada." };
  }

  const [nueva] = await db.insert(rifas).values(datos.data).returning({ id: rifas.id });
  revalidatePath("/", "layout");
  redirect(`/admin/rifas/${nueva.id}`);
}

const esquemaPremio = z.object({
  titulo: z.string().trim().min(3, "Escribe el nombre del premio.").max(100),
  descripcion: z.string().trim().max(500).optional(),
  valor: z.coerce.number().int().min(0),
  tipo: z.enum(["diario", "especial"]),
  diaSorteo: z.coerce.number().int().min(0).max(1000).optional(),
});

export async function agregarPremio(rifaId: number, _previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirAdmin();
  const datos = esquemaPremio.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(premios)
    .where(eq(premios.rifaId, rifaId));
  await db.insert(premios).values({
    rifaId,
    titulo: datos.data.titulo,
    descripcion: datos.data.descripcion || null,
    valor: datos.data.valor,
    tipo: datos.data.tipo,
    diaSorteo: datos.data.tipo === "especial" && datos.data.diaSorteo ? datos.data.diaSorteo : null,
    orden: total + 1,
  });
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Premio agregado." };
}

export async function eliminarPremio(premioId: number, _previo: EstadoAccion): Promise<EstadoAccion> {
  await requerirAdmin();
  const [usado] = await db
    .select({ id: sorteos.id })
    .from(sorteos)
    .where(eq(sorteos.premioId, premioId))
    .limit(1);
  if (usado) return { error: "Este premio ya tiene sorteos programados; no se puede eliminar." };
  await db.delete(premios).where(eq(premios.id, premioId));
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Premio eliminado." };
}

export async function iniciarCuentaRegresivaAccion(rifaId: number, _previo: EstadoAccion): Promise<EstadoAccion> {
  await requerirAdmin();
  const avisos = await db.transaction((tx) => activarCuentaRegresiva(tx, rifaId, false));
  if (!avisos.length) return { error: "La rifa ya tiene fecha de inicio de sorteos." };
  await enviarPush(avisos);
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Calendario de sorteos generado." };
}

export async function programarSorteo(sorteoId: number, _previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirAdmin();
  const loteriaId = Number(formData.get("loteriaId")) || null;
  const fecha = String(formData.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Selecciona una fecha válida." };
  const [sorteo] = await db.select().from(sorteos).where(eq(sorteos.id, sorteoId)).limit(1);
  if (!sorteo) return { error: "El sorteo no existe." };
  if (sorteo.estado === "publicado") return { error: "El sorteo ya fue publicado." };
  await db.update(sorteos).set({ loteriaId, fecha }).where(eq(sorteos.id, sorteoId));
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Sorteo actualizado." };
}

export async function publicarResultadoAccion(sorteoId: number, _previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirAdmin();
  const texto = String(formData.get("numero") ?? "").trim();
  if (!/^\d{1,6}$/.test(texto)) return { error: "Escribe el número ganador." };
  const r = await publicarResultado(sorteoId, Number(texto));
  revalidatePath("/", "layout");
  return aResultado(r);
}

export async function crearSorteoEspecial(rifaId: number, _previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirAdmin();
  const premioId = Number(formData.get("premioId"));
  const fecha = String(formData.get("fecha") ?? "");
  const loteriaId = Number(formData.get("loteriaId")) || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Selecciona la fecha del sorteo." };
  const [premio] = await db
    .select()
    .from(premios)
    .where(and(eq(premios.id, premioId), eq(premios.rifaId, rifaId)))
    .limit(1);
  if (!premio) return { error: "Selecciona el premio." };
  await db.insert(sorteos).values({
    rifaId,
    premioId: premio.id,
    titulo: `Gran sorteo: ${premio.titulo}`,
    valorPremio: premio.valor,
    fecha,
    loteriaId,
  });
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Sorteo especial programado." };
}

export async function marcarPremioPagado(sorteoId: number, _previo: EstadoAccion): Promise<EstadoAccion> {
  await requerirAdmin();
  const [sorteo] = await db.select().from(sorteos).where(eq(sorteos.id, sorteoId)).limit(1);
  if (!sorteo || sorteo.estado !== "publicado" || !sorteo.ganadorNombre) return { error: "Este sorteo no tiene ganador." };
  if (sorteo.pagado) return { error: "El premio ya estaba marcado como entregado." };
  await db.update(sorteos).set({ pagado: true, pagadoEn: new Date() }).where(eq(sorteos.id, sorteoId));
  if (sorteo.ganadorUsuarioId) {
    const avisos = [
      {
        usuarioId: sorteo.ganadorUsuarioId,
        tipo: "resultado" as const,
        titulo: "Tu premio fue entregado",
        mensaje: `Registramos la entrega de tu premio de ${sorteo.titulo}. ¡Gracias por jugar con Suertazo!`,
        enlace: "/cuenta",
      },
    ];
    await crearNotificaciones(db, avisos);
    await enviarPush(avisos);
  }
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: "Premio marcado como entregado." };
}

export async function crearLoteria(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirAdmin();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const diaJuego = String(formData.get("diaJuego") ?? "").trim() || null;
  if (nombre.length < 3) return { error: "Escribe el nombre de la lotería." };
  const creada = await db.insert(loterias).values({ nombre, diaJuego }).onConflictDoNothing().returning();
  if (!creada.length) return { error: "Esa lotería ya está registrada." };
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: "Lotería registrada." };
}

export async function alternarLoteria(loteriaId: number, _previo: EstadoAccion): Promise<EstadoAccion> {
  await requerirAdmin();
  await db
    .update(loterias)
    .set({ activa: sql`not ${loterias.activa}` })
    .where(eq(loterias.id, loteriaId));
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: "Lotería actualizada." };
}

export async function procesarRetiro(
  retiroId: number,
  decision: "pagado" | "rechazado",
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  await requerirAdmin();
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 300) || null;
  const [retiro] = await db.select().from(retiros).where(eq(retiros.id, retiroId)).limit(1);
  if (!retiro || retiro.estado !== "solicitado") return { error: "Este retiro ya fue procesado." };
  await db.update(retiros).set({ estado: decision, nota, procesadoEn: new Date() }).where(eq(retiros.id, retiroId));
  const avisos = [
    {
      usuarioId: retiro.usuarioId,
      tipo: "retiro" as const,
      titulo: decision === "pagado" ? "Tu retiro fue pagado" : "Tu retiro fue rechazado",
      mensaje:
        decision === "pagado"
          ? `Transferimos ${formatoPesos(retiro.monto)} de tus comisiones.${nota ? ` ${nota}` : ""}`
          : `No pudimos procesar el retiro de ${formatoPesos(retiro.monto)}${nota ? `: ${nota}` : "."} El saldo volvió a tu billetera.`,
      enlace: "/cuenta/billetera",
    },
  ];
  await crearNotificaciones(db, avisos);
  await enviarPush(avisos);
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: decision === "pagado" ? "Retiro marcado como pagado." : "Retiro rechazado." };
}

const esquemaAjustes = z.object({
  inicioTitulo: z.string().trim().min(3).max(150),
  inicioTexto: z.string().trim().min(3).max(1500),
  anuncio: z.string().trim().max(300).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  correoContacto: z.string().trim().max(120).optional(),
  nombrePasarela: z.string().trim().min(2).max(40),
  instruccionesPago: z.string().trim().max(800).optional(),
  comisionPorcentaje: z.coerce.number().int().min(0).max(100),
  nivelesComision: z.string().trim(),
  horasReserva: z.coerce.number().int().min(1).max(720),
  retiroMinimo: z.coerce.number().int().min(0),
});

export async function guardarAjustes(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirAdmin();
  const datos = esquemaAjustes.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  const niveles = datos.data.nivelesComision
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v));
  if (!niveles.length || niveles.length > 10 || niveles.some((v) => v < 0 || v > 100)) {
    return { error: "Escribe los porcentajes por línea separados por comas, por ejemplo 50, 10, 10, 10, 10." };
  }
  if (niveles.reduce((a, b) => a + b, 0) > 100) return { error: "La suma de las líneas no puede superar el 100% de la bolsa." };
  const valores = {
    ...datos.data,
    anuncio: datos.data.anuncio || null,
    whatsapp: datos.data.whatsapp || null,
    correoContacto: datos.data.correoContacto || null,
    instruccionesPago: datos.data.instruccionesPago || null,
    nivelesComision: niveles,
    actualizadoEn: new Date(),
  };
  await db.insert(ajustes).values({ id: 1, ...valores }).onConflictDoUpdate({ target: ajustes.id, set: valores });
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Ajustes guardados." };
}

export async function cambiarRol(usuarioId: number, _previo: EstadoAccion): Promise<EstadoAccion> {
  const admin = await requerirAdmin();
  if (admin.id === usuarioId) return { error: "No puedes cambiar tu propio rol." };
  const [u] = await db.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
  if (!u) return { error: "El usuario no existe." };
  await db
    .update(usuarios)
    .set({ rol: u.rol === "admin" ? "usuario" : "admin" })
    .where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: u.rol === "admin" ? "Ahora es usuario." : "Ahora es administrador." };
}
