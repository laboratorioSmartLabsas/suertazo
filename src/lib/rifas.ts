import { and, asc, eq, gt, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  abonos,
  ajustes,
  boletas,
  comisiones,
  loterias,
  ordenes,
  premios,
  recordatorios,
  retiros,
  rifas,
  sorteos,
  usuarios,
  type Ajustes,
  type Rifa,
} from "@/db/schema";
import { habilitadaParaSorteo, periodoDe, totalPeriodos } from "@/lib/cuotas";
import { formatoFecha, hoyColombia, sumarDias, sumarMeses } from "@/lib/fechas";
import { formatoBoleta, formatoPesos, nombrePublico } from "@/lib/formato";
import { crearNotificaciones, enviarPush, type NuevaNotificacion } from "@/lib/notificaciones";

export const MAX_BOLETAS_POR_ORDEN = 50;

export type Fase = "borrador" | "preventa" | "cuenta_regresiva" | "en_juego" | "finalizada";

export const ETIQUETA_FASE: Record<Fase, string> = {
  borrador: "Borrador",
  preventa: "Preventa",
  cuenta_regresiva: "Cuenta regresiva",
  en_juego: "Sorteos en curso",
  finalizada: "Finalizada",
};

export function totalBoletas(rifa: Pick<Rifa, "cifras">): number {
  return 10 ** rifa.cifras;
}

export function metaPreventa(rifa: Pick<Rifa, "cifras" | "porcentajePreventa">): number {
  return Math.ceil((totalBoletas(rifa) * rifa.porcentajePreventa) / 100);
}

export function faseRifa(rifa: Pick<Rifa, "estado" | "fechaInicioSorteos">, hoy = hoyColombia()): Fase {
  if (rifa.estado === "borrador") return "borrador";
  if (rifa.estado === "finalizada") return "finalizada";
  if (!rifa.fechaInicioSorteos) return "preventa";
  return hoy >= rifa.fechaInicioSorteos ? "en_juego" : "cuenta_regresiva";
}

export function ventaAbierta(rifa: Pick<Rifa, "estado">): boolean {
  return rifa.estado === "activa";
}

const AJUSTES_POR_DEFECTO: Omit<Ajustes, "actualizadoEn"> = {
  id: 1,
  marcaNombre: "Suertazo",
  inicioTitulo: "Juega, gana y comparte la suerte",
  inicioTexto: "Compra tu boleta, sigue los sorteos diarios y gana premios todos los días.",
  anuncio: null,
  whatsapp: null,
  correoContacto: null,
  nombrePasarela: "Wompi",
  instruccionesPago: null,
  comisionPorcentaje: 20,
  nivelesComision: [50, 10, 10, 10, 20],
  horasReserva: 48,
  retiroMinimo: 50000,
};

export async function obtenerAjustes(tx: Tx | typeof db = db): Promise<Omit<Ajustes, "actualizadoEn">> {
  const [fila] = await tx.select().from(ajustes).where(eq(ajustes.id, 1)).limit(1);
  return fila ?? AJUSTES_POR_DEFECTO;
}

export async function conteoBoletas(rifaIds: number[]) {
  const mapa = new Map<number, { vendidas: number; reservadas: number }>();
  for (const id of rifaIds) mapa.set(id, { vendidas: 0, reservadas: 0 });
  if (!rifaIds.length) return mapa;
  const filas = await db
    .select({ rifaId: boletas.rifaId, estado: boletas.estado, total: sql<number>`count(*)::int` })
    .from(boletas)
    .where(inArray(boletas.rifaId, rifaIds))
    .groupBy(boletas.rifaId, boletas.estado);
  for (const f of filas) {
    const actual = mapa.get(f.rifaId)!;
    if (f.estado === "vendida") actual.vendidas = f.total;
    else actual.reservadas = f.total;
  }
  return mapa;
}

/** Libera los números de las solicitudes que superaron el tiempo de reserva sin ser aprobadas. */
export async function vencerOrdenes(): Promise<number> {
  return db.transaction(async (tx) => {
    const vencidas = await tx
      .update(ordenes)
      .set({ estado: "vencida" })
      .where(and(eq(ordenes.estado, "pendiente"), lt(ordenes.venceEn, new Date())))
      .returning({ id: ordenes.id });
    if (vencidas.length) {
      await tx.delete(boletas).where(
        and(
          inArray(
            boletas.ordenId,
            vencidas.map((v) => v.id),
          ),
          eq(boletas.estado, "reservada"),
        ),
      );
    }
    return vencidas.length;
  });
}

async function cadenaReferidores(tx: Tx, inicioId: number | null, compradorId: number | null, niveles: number) {
  const cadena: { id: number; nivel: number }[] = [];
  const vistos = new Set<number>();
  if (compradorId) vistos.add(compradorId);
  let actual = inicioId;
  for (let nivel = 1; nivel <= niveles && actual; nivel++) {
    if (vistos.has(actual)) break;
    vistos.add(actual);
    cadena.push({ id: actual, nivel });
    const [u] = await tx
      .select({ referidoPorId: usuarios.referidoPorId })
      .from(usuarios)
      .where(eq(usuarios.id, actual))
      .limit(1);
    actual = u?.referidoPorId ?? null;
  }
  return cadena;
}

export async function generarSorteos(tx: Tx, rifa: Rifa, inicio: string) {
  const listaPremios = await tx.select().from(premios).where(eq(premios.rifaId, rifa.id)).orderBy(asc(premios.orden));
  const diario = listaPremios.find((p) => p.tipo === "diario");
  const filas: (typeof sorteos.$inferInsert)[] = [];
  if (rifa.premioDiario > 0) {
    for (let dia = 1; dia <= rifa.diasSorteo; dia++) {
      filas.push({
        rifaId: rifa.id,
        premioId: diario?.id ?? null,
        titulo: `Sorteo diario #${dia}`,
        valorPremio: rifa.premioDiario,
        fecha: sumarDias(inicio, dia - 1),
        numeroDia: dia,
      });
    }
  }
  for (const p of listaPremios) {
    if (p.tipo !== "especial" || !p.diaSorteo) continue;
    const dia = Math.min(Math.max(p.diaSorteo, 1), Math.max(rifa.diasSorteo, 1));
    filas.push({
      rifaId: rifa.id,
      premioId: p.id,
      titulo: `Gran sorteo: ${p.titulo}`,
      valorPremio: p.valor,
      fecha: sumarDias(inicio, dia - 1),
      numeroDia: dia,
    });
  }
  for (let i = 0; i < filas.length; i += 500) {
    await tx.insert(sorteos).values(filas.slice(i, i + 500));
  }
  return filas.length;
}

/** Fija la fecha de inicio de los sorteos (hoy + meses de espera) y genera el calendario. */
export async function activarCuentaRegresiva(tx: Tx, rifaId: number, porMeta = true): Promise<NuevaNotificacion[]> {
  const [rifa] = await tx.select().from(rifas).where(eq(rifas.id, rifaId)).for("update");
  if (!rifa || rifa.fechaInicioSorteos) return [];
  const inicio = sumarMeses(hoyColombia(), rifa.mesesEspera);
  await tx.update(rifas).set({ fechaUmbral: new Date(), fechaInicioSorteos: inicio }).where(eq(rifas.id, rifa.id));
  await generarSorteos(tx, rifa, inicio);
  const aviso: NuevaNotificacion = {
    usuarioId: null,
    tipo: "sistema",
    titulo: `¡${rifa.nombre} ya tiene fecha!`,
    mensaje: porMeta
      ? `Se alcanzó el ${rifa.porcentajePreventa}% de la boletería. Los sorteos inician el ${formatoFecha(inicio)}.`
      : `Los sorteos diarios inician el ${formatoFecha(inicio)}. ¡Asegura tus números antes de esa fecha!`,
    enlace: `/rifas/${rifa.slug}`,
  };
  await crearNotificaciones(tx, [aviso]);
  return [aviso];
}

async function verificarUmbral(tx: Tx, rifaId: number): Promise<NuevaNotificacion[]> {
  const [rifa] = await tx.select().from(rifas).where(eq(rifas.id, rifaId)).limit(1);
  if (!rifa || rifa.fechaInicioSorteos) return [];
  const [{ vendidas }] = await tx
    .select({ vendidas: sql<number>`count(*)::int` })
    .from(boletas)
    .where(and(eq(boletas.rifaId, rifaId), eq(boletas.estado, "vendida")));
  if (vendidas < metaPreventa(rifa)) return [];
  return activarCuentaRegresiva(tx, rifaId);
}

export type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string };

export async function aprobarOrden(ordenId: number, adminId: number): Promise<Resultado> {
  let avisos: NuevaNotificacion[] = [];
  try {
    const resultado = await db.transaction(async (tx): Promise<Resultado> => {
      const [orden] = await tx.select().from(ordenes).where(eq(ordenes.id, ordenId)).for("update");
      if (!orden) return { ok: false, error: "La solicitud no existe." };
      if (orden.estado === "aprobada") return { ok: false, error: "Esta solicitud ya estaba aprobada." };
      if (orden.estado === "rechazada") return { ok: false, error: "La solicitud fue rechazada; el comprador debe crear una nueva." };
      const [rifa] = await tx.select().from(rifas).where(eq(rifas.id, orden.rifaId)).limit(1);

      const fechaSolicitud = hoyColombia(orden.creadoEn);
      if (orden.tipo === "compra") {
        if (orden.estado === "vencida") {
          const tomadas = await tx
            .select({ numero: boletas.numero })
            .from(boletas)
            .where(and(eq(boletas.rifaId, orden.rifaId), inArray(boletas.numero, orden.numeros)));
          if (tomadas.length) {
            return {
              ok: false,
              error: `La reserva venció y los números ${tomadas.map((t) => formatoBoleta(t.numero, rifa.cifras)).join(", ")} ya tienen otro dueño. Contacta al comprador para asignarle otros.`,
            };
          }
          await tx.insert(boletas).values(
            orden.numeros.map((numero) => ({
              rifaId: orden.rifaId,
              numero,
              ordenId: orden.id,
              usuarioId: orden.usuarioId,
              estado: "vendida" as const,
              plan: orden.plan,
              precio: rifa.precioBoleta,
            })),
          );
        } else {
          await tx
            .update(boletas)
            .set({ estado: "vendida", usuarioId: orden.usuarioId })
            .where(eq(boletas.ordenId, orden.id));
        }
        const compradas = await tx.select().from(boletas).where(eq(boletas.ordenId, orden.id));
        const montoPorBoleta = Math.round(orden.total / Math.max(compradas.length, 1));
        await tx.insert(abonos).values(
          compradas.map((b) => ({
            boletaId: b.id,
            ordenId: orden.id,
            mes: orden.plan === "cuotas" ? (orden.mes ?? 1) : null,
            monto: montoPorBoleta,
            fechaSolicitud,
          })),
        );
      } else {
        const items = orden.detalle ?? [];
        if (!items.length) return { ok: false, error: "La solicitud de cuota no tiene boletas." };
        const montoPorCuota = Math.round(orden.total / items.length);
        await tx.insert(abonos).values(
          items.map((item) => ({
            boletaId: item.boletaId,
            ordenId: orden.id,
            mes: item.mes,
            monto: montoPorCuota,
            fechaSolicitud,
          })),
        );
      }

      await tx
        .update(ordenes)
        .set({ estado: "aprobada", revisadoEn: new Date(), revisadoPorId: adminId })
        .where(eq(ordenes.id, orden.id));

      const config = await obtenerAjustes(tx);
      let inicioCadena = orden.referidorId;
      if (orden.usuarioId) {
        const [comprador] = await tx
          .select({ referidoPorId: usuarios.referidoPorId })
          .from(usuarios)
          .where(eq(usuarios.id, orden.usuarioId))
          .limit(1);
        inicioCadena = comprador?.referidoPorId ?? orden.referidorId;
      }
      const cadena = await cadenaReferidores(tx, inicioCadena, orden.usuarioId, config.nivelesComision.length);
      const bolsa = (orden.total * config.comisionPorcentaje) / 100;
      const nuevasComisiones = cadena
        .map(({ id, nivel }) => {
          const porcentajeNivel = config.nivelesComision[nivel - 1] ?? 0;
          return {
            beneficiarioId: id,
            ordenId: orden.id,
            nivel,
            porcentajeNivel,
            baseVenta: orden.total,
            monto: Math.round((bolsa * porcentajeNivel) / 100),
            compradorNombre: nombrePublico(orden.nombreContacto),
          };
        })
        .filter((c) => c.monto > 0);
      if (nuevasComisiones.length) await tx.insert(comisiones).values(nuevasComisiones);

      const numeros = orden.numeros.map((n) => formatoBoleta(n, rifa.cifras)).join(", ");
      const lista: NuevaNotificacion[] = [];
      if (orden.usuarioId) {
        lista.push(
          orden.tipo === "compra"
            ? {
                usuarioId: orden.usuarioId,
                tipo: "compra",
                titulo: "¡Tu compra fue aprobada!",
                mensaje:
                  orden.plan === "cuotas"
                    ? `Confirmamos tu primera cuota (solicitud ${orden.referencia}). Tus boletas ${numeros} juegan el mes ${orden.mes ?? 1} de ${rifa.nombre}.`
                    : `Confirmamos tu pago de la solicitud ${orden.referencia}. Tus boletas ${numeros} ya juegan en ${rifa.nombre}.`,
                enlace: "/cuenta",
              }
            : {
                usuarioId: orden.usuarioId,
                tipo: "compra",
                titulo: "Cuota aprobada",
                mensaje: `Confirmamos el pago ${orden.referencia}. Tus boletas ${numeros} quedan habilitadas para los meses pagados.`,
                enlace: "/cuenta",
              },
        );
      }
      for (const c of nuevasComisiones) {
        lista.push({
          usuarioId: c.beneficiarioId,
          tipo: "comision",
          titulo: `Ganaste ${formatoPesos(c.monto)} en comisiones`,
          mensaje: `Tu línea ${c.nivel} hizo una compra en ${rifa.nombre}. Ya está en tu billetera.`,
          enlace: "/cuenta/billetera",
        });
      }
      await crearNotificaciones(tx, lista);
      avisos = [...lista, ...(await verificarUmbral(tx, orden.rifaId))];
      return { ok: true, mensaje: `Solicitud ${orden.referencia} aprobada.` };
    });
    if (resultado.ok) await enviarPush(avisos);
    return resultado;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "Alguna boleta o cuota de esta solicitud ya estaba registrada." };
    }
    throw error;
  }
}

export async function rechazarOrden(ordenId: number, adminId: number, nota: string | null): Promise<Resultado> {
  let avisos: NuevaNotificacion[] = [];
  const resultado = await db.transaction(async (tx): Promise<Resultado> => {
    const [orden] = await tx.select().from(ordenes).where(eq(ordenes.id, ordenId)).for("update");
    if (!orden) return { ok: false, error: "La solicitud no existe." };
    if (orden.estado === "aprobada") return { ok: false, error: "No se puede rechazar una solicitud aprobada." };
    if (orden.estado === "rechazada") return { ok: false, error: "La solicitud ya estaba rechazada." };
    await tx.delete(boletas).where(and(eq(boletas.ordenId, orden.id), eq(boletas.estado, "reservada")));
    await tx
      .update(ordenes)
      .set({ estado: "rechazada", notaAdmin: nota, revisadoEn: new Date(), revisadoPorId: adminId })
      .where(eq(ordenes.id, orden.id));
    if (orden.usuarioId) {
      avisos = [
        {
          usuarioId: orden.usuarioId,
          tipo: "compra",
          titulo: "No pudimos confirmar tu pago",
          mensaje: `La solicitud ${orden.referencia} fue rechazada${nota ? `: ${nota}` : "."} Si ya pagaste, escríbenos con tu comprobante.`,
          enlace: "/cuenta",
        },
      ];
      await crearNotificaciones(tx, avisos);
    }
    return { ok: true, mensaje: `Solicitud ${orden.referencia} rechazada.` };
  });
  if (resultado.ok) await enviarPush(avisos);
  return resultado;
}

export async function publicarResultado(sorteoId: number, numeroGanador: number): Promise<Resultado> {
  let avisos: NuevaNotificacion[] = [];
  const resultado = await db.transaction(async (tx): Promise<Resultado> => {
    const [sorteo] = await tx.select().from(sorteos).where(eq(sorteos.id, sorteoId)).for("update");
    if (!sorteo) return { ok: false, error: "El sorteo no existe." };
    if (sorteo.estado === "publicado") return { ok: false, error: "Este sorteo ya tiene resultado publicado." };
    if (!sorteo.loteriaId) return { ok: false, error: "Asigna primero la lotería con la que se juega este sorteo." };
    if (sorteo.fecha > hoyColombia()) return { ok: false, error: "Solo puedes publicar el resultado el día del sorteo o después." };
    const [rifa] = await tx.select().from(rifas).where(eq(rifas.id, sorteo.rifaId)).limit(1);
    if (!Number.isInteger(numeroGanador) || numeroGanador < 0 || numeroGanador >= totalBoletas(rifa)) {
      return { ok: false, error: `El número ganador debe tener ${rifa.cifras} cifras.` };
    }
    const [loteria] = await tx.select().from(loterias).where(eq(loterias.id, sorteo.loteriaId)).limit(1);
    const [ganadora] = await tx
      .select({ boleta: boletas, orden: ordenes, usuario: usuarios })
      .from(boletas)
      .innerJoin(ordenes, eq(ordenes.id, boletas.ordenId))
      .leftJoin(usuarios, eq(usuarios.id, boletas.usuarioId))
      .where(and(eq(boletas.rifaId, rifa.id), eq(boletas.numero, numeroGanador), eq(boletas.estado, "vendida")))
      .limit(1);
    const numeroTexto = formatoBoleta(numeroGanador, rifa.cifras);
    let habilitada = false;
    if (ganadora) {
      const mes = rifa.fechaInicioSorteos ? Math.max(periodoDe(rifa.fechaInicioSorteos, sorteo.fecha), 1) : 1;
      const pendientes = await tx
        .select({ referencia: ordenes.referencia, detalle: ordenes.detalle })
        .from(ordenes)
        .where(and(eq(ordenes.rifaId, rifa.id), eq(ordenes.estado, "pendiente"), eq(ordenes.tipo, "cuota")));
      const enRevision = pendientes.find((o) =>
        (o.detalle ?? []).some((d) => d.boletaId === ganadora.boleta.id && d.mes === mes),
      );
      if (enRevision) {
        return {
          ok: false,
          error: `La boleta ${numeroTexto} tiene la cuota del mes ${mes} en revisión (${enRevision.referencia}). Apruébala o recházala antes de publicar.`,
        };
      }
      const abonosBoleta = await tx.select().from(abonos).where(eq(abonos.boletaId, ganadora.boleta.id));
      habilitada = habilitadaParaSorteo(ganadora.boleta, abonosBoleta, sorteo.fecha, mes);
    }
    const hayGanador = Boolean(ganadora && habilitada);
    const ganadorNombre = ganadora && hayGanador ? (ganadora.usuario?.nombre ?? ganadora.orden.nombreContacto) : null;
    await tx
      .update(sorteos)
      .set({
        numeroGanador,
        boletaId: ganadora?.boleta.id ?? null,
        ganadorUsuarioId: hayGanador ? (ganadora?.usuario?.id ?? null) : null,
        ganadorNombre,
        boletaSinCuota: Boolean(ganadora && !habilitada),
        estado: "publicado",
        publicadoEn: new Date(),
      })
      .where(eq(sorteos.id, sorteo.id));

    const nombreLoteria = loteria?.nombre ?? "la lotería";
    const premioTexto = sorteo.valorPremio ? formatoPesos(sorteo.valorPremio) : "este sorteo";
    const lista: NuevaNotificacion[] = [
      {
        usuarioId: null,
        tipo: "resultado",
        titulo: `${sorteo.titulo}: salió el ${numeroTexto}`,
        mensaje: hayGanador
          ? `Con ${nombreLoteria} ganó ${nombrePublico(ganadorNombre)} el premio de ${premioTexto}. ¡Felicitaciones!`
          : ganadora
            ? `Con ${nombreLoteria} salió el ${numeroTexto}, pero esa boleta no tenía al día la cuota del mes. El premio queda sin ganador.`
            : `Con ${nombreLoteria} salió el ${numeroTexto}, que no fue vendido. El premio queda sin ganador.`,
        enlace: "/premios",
      },
    ];
    if (ganadora?.usuario && !habilitada) {
      lista.push({
        usuarioId: ganadora.usuario.id,
        tipo: "resultado",
        titulo: "Tu número salió, pero la boleta no estaba al día",
        mensaje: `La boleta ${numeroTexto} salió en ${sorteo.titulo}, pero no tenía pagada la cuota del mes. Paga tus cuotas a tiempo para no perderte ningún premio.`,
        enlace: "/cuenta",
      });
    }
    if (ganadora?.usuario && habilitada) {
      lista.push({
        usuarioId: ganadora.usuario.id,
        tipo: "resultado",
        titulo: "¡Ganaste! 🎉",
        mensaje: `Tu boleta ${numeroTexto} ganó en ${sorteo.titulo} de ${rifa.nombre}. Nos pondremos en contacto para entregarte tu premio.`,
        enlace: "/cuenta",
      });
    }
    await crearNotificaciones(tx, lista);
    avisos = lista;
    return {
      ok: true,
      mensaje: hayGanador
        ? `Resultado publicado. Ganador: ${ganadorNombre} (boleta ${numeroTexto}).`
        : ganadora
          ? `Resultado publicado. La boleta ${numeroTexto} no tenía la cuota del mes: sin ganador.`
          : `Resultado publicado. El número ${numeroTexto} no fue vendido.`,
    };
  });
  if (resultado.ok) await enviarPush(avisos);
  return resultado;
}

export async function saldoBilletera(usuarioId: number, tx: Tx | typeof db = db) {
  const [ganado] = await tx
    .select({ total: sql<number>`coalesce(sum(${comisiones.monto}), 0)::int` })
    .from(comisiones)
    .where(eq(comisiones.beneficiarioId, usuarioId));
  const filasRetiros = await tx
    .select({ estado: retiros.estado, total: sql<number>`coalesce(sum(${retiros.monto}), 0)::int` })
    .from(retiros)
    .where(eq(retiros.usuarioId, usuarioId))
    .groupBy(retiros.estado);
  const pagado = filasRetiros.find((r) => r.estado === "pagado")?.total ?? 0;
  const enProceso = filasRetiros.find((r) => r.estado === "solicitado")?.total ?? 0;
  return {
    ganado: ganado.total,
    pagado,
    enProceso,
    disponible: ganado.total - pagado - enProceso,
  };
}

/** Avisa una vez por mes a quienes tienen boletas en cuotas sin la cuota del mes en curso. */
export async function enviarRecordatoriosCuota(): Promise<number> {
  const hoy = hoyColombia();
  const activas = await db
    .select()
    .from(rifas)
    .where(and(eq(rifas.estado, "activa"), isNotNull(rifas.fechaInicioSorteos), gt(rifas.valorCuota, 0)));
  const avisos: NuevaNotificacion[] = [];
  for (const rifa of activas) {
    const inicio = rifa.fechaInicioSorteos!;
    if (hoy < inicio) continue;
    const mes = periodoDe(inicio, hoy);
    if (mes > totalPeriodos(rifa)) continue;
    const lista = await db
      .select({ id: boletas.id, usuarioId: boletas.usuarioId, precio: boletas.precio, numero: boletas.numero })
      .from(boletas)
      .where(
        and(
          eq(boletas.rifaId, rifa.id),
          eq(boletas.estado, "vendida"),
          eq(boletas.plan, "cuotas"),
          isNotNull(boletas.usuarioId),
        ),
      );
    if (!lista.length) continue;
    const pagos = await db
      .select({ boletaId: abonos.boletaId, mes: abonos.mes, monto: abonos.monto })
      .from(abonos)
      .where(inArray(abonos.boletaId, lista.map((b) => b.id)));
    const porUsuario = new Map<number, number[]>();
    for (const b of lista) {
      const propios = pagos.filter((p) => p.boletaId === b.id);
      const pagado = propios.reduce((acc, p) => acc + p.monto, 0);
      if (pagado >= b.precio || propios.some((p) => p.mes === mes)) continue;
      porUsuario.set(b.usuarioId!, [...(porUsuario.get(b.usuarioId!) ?? []), b.numero]);
    }
    for (const [usuarioId, numeros] of porUsuario) {
      const nuevos = await db
        .insert(recordatorios)
        .values({ usuarioId, rifaId: rifa.id, mes })
        .onConflictDoNothing()
        .returning({ id: recordatorios.id });
      if (!nuevos.length) continue;
      avisos.push({
        usuarioId,
        tipo: "sistema",
        titulo: `Paga la cuota del mes ${mes} y sigue jugando`,
        mensaje: `Tus boletas ${numeros.map((n) => formatoBoleta(n, rifa.cifras)).join(", ")} de ${rifa.nombre} no juegan este mes hasta que pagues la cuota de ${formatoPesos(rifa.valorCuota)}.`,
        enlace: "/cuenta",
      });
    }
  }
  await crearNotificaciones(db, avisos);
  await enviarPush(avisos);
  return avisos.length;
}

export async function ejecutarTareas() {
  const vencidas = await vencerOrdenes();
  const recordatoriosEnviados = await enviarRecordatoriosCuota();
  return { vencidas, recordatoriosEnviados };
}
