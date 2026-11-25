import { and, asc, desc, eq, gt, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { loterias, notificaciones, premios, rifas, sorteos, type Rifa } from "@/db/schema";
import { COOKIE_VISTAS, type UsuarioSesion } from "@/lib/auth";
import { hoyColombia } from "@/lib/fechas";
import { conteoBoletas, faseRifa, metaPreventa, totalBoletas, type Fase } from "@/lib/rifas";

export type RifaConEstado = Rifa & {
  fase: Fase;
  vendidas: number;
  reservadas: number;
  total: number;
  meta: number;
  premios: (typeof premios.$inferSelect)[];
};

async function enriquecer(lista: Rifa[]): Promise<RifaConEstado[]> {
  if (!lista.length) return [];
  const ids = lista.map((r) => r.id);
  const conteos = await conteoBoletas(ids);
  const todosPremios = await db.select().from(premios).where(inArray(premios.rifaId, ids)).orderBy(asc(premios.orden));
  return lista.map((r) => ({
    ...r,
    fase: faseRifa(r),
    vendidas: conteos.get(r.id)?.vendidas ?? 0,
    reservadas: conteos.get(r.id)?.reservadas ?? 0,
    total: totalBoletas(r),
    meta: metaPreventa(r),
    premios: todosPremios.filter((p) => p.rifaId === r.id),
  }));
}

export async function rifasPublicas(): Promise<RifaConEstado[]> {
  const lista = await db.select().from(rifas).where(eq(rifas.estado, "activa")).orderBy(desc(rifas.creadoEn));
  return enriquecer(lista);
}

export async function todasLasRifas(): Promise<RifaConEstado[]> {
  const lista = await db.select().from(rifas).orderBy(desc(rifas.creadoEn));
  return enriquecer(lista);
}

export async function rifaPorSlug(slug: string): Promise<RifaConEstado | null> {
  const [rifa] = await db.select().from(rifas).where(eq(rifas.slug, slug)).limit(1);
  if (!rifa || rifa.estado === "borrador") return null;
  const [conEstado] = await enriquecer([rifa]);
  return conEstado;
}

export async function rifaPorId(id: number): Promise<RifaConEstado | null> {
  const [rifa] = await db.select().from(rifas).where(eq(rifas.id, id)).limit(1);
  if (!rifa) return null;
  const [conEstado] = await enriquecer([rifa]);
  return conEstado;
}

export async function ultimosResultados(limite = 20, rifaId?: number) {
  return db
    .select({
      id: sorteos.id,
      titulo: sorteos.titulo,
      fecha: sorteos.fecha,
      valorPremio: sorteos.valorPremio,
      numeroGanador: sorteos.numeroGanador,
      ganadorNombre: sorteos.ganadorNombre,
      boletaSinCuota: sorteos.boletaSinCuota,
      boletaId: sorteos.boletaId,
      publicadoEn: sorteos.publicadoEn,
      loteria: loterias.nombre,
      rifaNombre: rifas.nombre,
      rifaSlug: rifas.slug,
      cifras: rifas.cifras,
    })
    .from(sorteos)
    .innerJoin(rifas, eq(rifas.id, sorteos.rifaId))
    .leftJoin(loterias, eq(loterias.id, sorteos.loteriaId))
    .where(and(eq(sorteos.estado, "publicado"), rifaId ? eq(sorteos.rifaId, rifaId) : undefined))
    .orderBy(desc(sorteos.fecha), desc(sorteos.publicadoEn))
    .limit(limite);
}

export async function proximosSorteos(rifaId: number, limite = 5) {
  return db
    .select({
      id: sorteos.id,
      titulo: sorteos.titulo,
      fecha: sorteos.fecha,
      valorPremio: sorteos.valorPremio,
      loteria: loterias.nombre,
    })
    .from(sorteos)
    .leftJoin(loterias, eq(loterias.id, sorteos.loteriaId))
    .where(and(eq(sorteos.rifaId, rifaId), eq(sorteos.estado, "programado"), gte(sorteos.fecha, hoyColombia())))
    .orderBy(asc(sorteos.fecha), asc(sorteos.id))
    .limit(limite);
}

export async function avisosPublicos(limite = 10) {
  return db
    .select()
    .from(notificaciones)
    .where(and(isNull(notificaciones.usuarioId), eq(notificaciones.tipo, "sistema")))
    .orderBy(desc(notificaciones.creadoEn))
    .limit(limite);
}

export async function notificacionesDe(usuarioId: number, limite = 50) {
  return db
    .select()
    .from(notificaciones)
    .where(or(eq(notificaciones.usuarioId, usuarioId), isNull(notificaciones.usuarioId)))
    .orderBy(desc(notificaciones.creadoEn))
    .limit(limite);
}

export async function contarNoLeidas(usuario: UsuarioSesion | null): Promise<number> {
  if (usuario) {
    const desde = usuario.notificacionesVistasEn ?? usuario.creadoEn;
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(notificaciones)
      .where(
        and(
          or(eq(notificaciones.usuarioId, usuario.id), isNull(notificaciones.usuarioId)),
          gt(notificaciones.creadoEn, desde),
        ),
      );
    return total;
  }
  const almacen = await cookies();
  const vistas = almacen.get(COOKIE_VISTAS)?.value;
  const desde = vistas && !Number.isNaN(Date.parse(vistas)) ? new Date(vistas) : new Date(Date.now() - 7 * 86_400_000);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(notificaciones)
    .where(and(isNull(notificaciones.usuarioId), gt(notificaciones.creadoEn, desde)));
  return total;
}
