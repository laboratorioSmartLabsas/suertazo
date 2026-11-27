import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Clock, Ticket, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { LeyendaMeses, MesesBoleta } from "@/components/cuenta/meses-boleta";
import { InsigniaFase } from "@/components/rifa/insignia-fase";
import { crearOrdenCuota } from "@/app/acciones/compras";
import { db } from "@/db";
import { abonos, boletas, ordenes, rifas, usuarios, type Rifa } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { mesVigente, resumenBoleta, totalPeriodos } from "@/lib/cuotas";
import { formatoFecha, formatoFechaHora } from "@/lib/fechas";
import { formatoBoleta, formatoPesos } from "@/lib/formato";
import { faseRifa, saldoBilletera, vencerOrdenes } from "@/lib/rifas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mis boletas" };

const MESES_ADELANTADOS = 2;

export default async function InicioCuenta() {
  const usuario = await requerirUsuario();
  await vencerOrdenes();

  const [mias, pendientes, saldo, [{ directos }], rifasAbiertas] = await Promise.all([
    db
      .select({ boleta: boletas, rifa: rifas })
      .from(boletas)
      .innerJoin(rifas, eq(rifas.id, boletas.rifaId))
      .where(eq(boletas.usuarioId, usuario.id))
      .orderBy(asc(rifas.id), asc(boletas.numero)),
    db
      .select({ orden: ordenes, rifaNombre: rifas.nombre, cifras: rifas.cifras })
      .from(ordenes)
      .innerJoin(rifas, eq(rifas.id, ordenes.rifaId))
      .where(and(eq(ordenes.usuarioId, usuario.id), eq(ordenes.estado, "pendiente")))
      .orderBy(desc(ordenes.creadoEn)),
    saldoBilletera(usuario.id),
    db.select({ directos: sql<number>`count(*)::int` }).from(usuarios).where(eq(usuarios.referidoPorId, usuario.id)),
    db.select().from(rifas).where(eq(rifas.estado, "activa")),
  ]);

  const ids = mias.map((m) => m.boleta.id);
  const pagos = ids.length ? await db.select().from(abonos).where(inArray(abonos.boletaId, ids)) : [];
  const enRevision = pendientes.flatMap((p) => (p.orden.tipo === "cuota" ? (p.orden.detalle ?? []) : []));

  const porRifa = new Map<number, { rifa: Rifa; filas: typeof mias }>();
  for (const m of mias) {
    const grupo = porRifa.get(m.rifa.id) ?? { rifa: m.rifa, filas: [] };
    grupo.filas.push(m);
    porRifa.set(m.rifa.id, grupo);
  }
  const vendidas = mias.filter((m) => m.boleta.estado === "vendida").length;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="#mis-boletas" className="rounded-2xl border borde-oro bg-card/70 p-4 hover:bg-card">
          <Ticket className="size-5 text-primary" />
          <p className="mt-2 text-2xl font-bold">{vendidas}</p>
          <p className="text-sm text-muted-foreground">Boletas confirmadas</p>
        </Link>
        <Link href="/cuenta/billetera" className="rounded-2xl border borde-oro bg-card/70 p-4 hover:bg-card">
          <Wallet className="size-5 text-primary" />
          <p className="mt-2 text-2xl font-bold">{formatoPesos(saldo.disponible)}</p>
          <p className="text-sm text-muted-foreground">Disponible en tu billetera</p>
        </Link>
        <Link href="/cuenta/referidos" className="rounded-2xl border borde-oro bg-card/70 p-4 hover:bg-card">
          <Users className="size-5 text-primary" />
          <p className="mt-2 text-2xl font-bold">{directos}</p>
          <p className="text-sm text-muted-foreground">Referidos directos</p>
        </Link>
      </section>

      {pendientes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="size-5 text-primary" /> Pendientes de aprobación
          </h2>
          <ul className="flex flex-col gap-2">
            {pendientes.map(({ orden, rifaNombre, cifras }) => (
              <li key={orden.id}>
                <Link
                  href={`/compra/${orden.referencia}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 hover:bg-primary/10"
                >
                  <div>
                    <p className="font-semibold">
                      {orden.referencia} · {orden.tipo === "cuota" ? "Pago de cuotas" : "Compra"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {rifaNombre} · {orden.numeros.map((n) => formatoBoleta(n, cifras)).join(", ")} · reservado hasta{" "}
                      {formatoFechaHora(orden.venceEn)}
                    </p>
                  </div>
                  <span className="text-right">
                    <span className="block font-bold text-primary">{formatoPesos(orden.total)}</span>
                    <span className="block text-xs text-muted-foreground">Pendiente de aprobación del máster</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="mis-boletas" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-lg font-semibold">Mis boletas</h2>
        {porRifa.size === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-muted-foreground">Aún no tienes boletas. Elige tus números y empieza a jugar.</p>
              <Link href="/#rifas" className={cn(buttonVariants({ size: "lg" }), "fondo-oro")}>
                Ver rifas disponibles
              </Link>
            </CardContent>
          </Card>
        ) : (
          [...porRifa.values()].map(({ rifa, filas }) => {
            const fase = faseRifa(rifa);
            const desde = mesVigente(rifa);
            const hasta = Math.min(totalPeriodos(rifa), desde + MESES_ADELANTADOS);
            const conCuotas = filas.some((f) => f.boleta.plan === "cuotas" && f.boleta.estado === "vendida");
            const resumenes = filas.map((f) => ({
              ...f,
              resumen: resumenBoleta(
                f.boleta,
                pagos.filter((p) => p.boletaId === f.boleta.id),
                enRevision.filter((d) => d.boletaId === f.boleta.id).map((d) => d.mes),
                rifa,
              ),
            }));
            const pagables = resumenes.filter(
              (r) => r.boleta.plan === "cuotas" && r.boleta.estado === "vendida" && !r.resumen.completa,
            );
            return (
              <Card key={rifa.id} className="borde-oro border">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-heading tracking-wide">{rifa.nombre}</CardTitle>
                    <InsigniaFase fase={fase} />
                  </div>
                  <CardDescription>
                    {rifa.fechaInicioSorteos
                      ? fase === "en_juego"
                        ? `Sorteos en curso · mes ${mesVigente(rifa)} de ${totalPeriodos(rifa)}`
                        : `Los sorteos inician el ${formatoFecha(rifa.fechaInicioSorteos)}`
                      : `Preventa: la fecha de inicio se fija al vender el ${rifa.porcentajePreventa}%`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <ul className="flex flex-col gap-3">
                    {resumenes.map(({ boleta, resumen }) => (
                      <li key={boleta.id} className="flex flex-col gap-3 rounded-xl bg-black/30 p-3 sm:flex-row sm:items-center">
                        <span className="fondo-oro flex h-12 w-24 shrink-0 items-center justify-center rounded-lg font-heading text-xl font-bold tracking-widest">
                          {formatoBoleta(boleta.numero, rifa.cifras)}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            {boleta.estado === "reservada" ? (
                              <Badge variant="outline">Pendiente de aprobación</Badge>
                            ) : resumen.completa ? (
                              <Badge className="bg-emerald-600 text-white">Pagada</Badge>
                            ) : resumen.alDia ? (
                              <Badge className="bg-emerald-600/80 text-white">Al día</Badge>
                            ) : (
                              <Badge variant="destructive">No juega este mes</Badge>
                            )}
                            <span className="text-muted-foreground">
                              {boleta.plan === "cuotas"
                                ? `Cuotas: ${resumen.cuotasPagadas} de ${resumen.cuotasRequeridas} · pagado ${formatoPesos(resumen.pagado)}`
                                : "Pago de contado"}
                            </span>
                          </div>
                          {boleta.plan === "cuotas" && boleta.estado === "vendida" && (
                            <MesesBoleta meses={resumen.meses} mesActual={resumen.mesActual} />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {conCuotas && <LeyendaMeses />}

                  {pagables.length > 0 && rifa.estado === "activa" && (
                    <FormAccion accion={crearOrdenCuota} className="flex flex-col gap-3 rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4">
                      <input type="hidden" name="rifaId" value={rifa.id} />
                      <div>
                        <p className="font-semibold">Pagar cuotas</p>
                        <p className="text-sm text-muted-foreground">
                          Cada cuota vale {formatoPesos(rifa.valorCuota)} y habilita la boleta todos los sorteos de ese mes.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {pagables.map(({ boleta, resumen }) => {
                          const opciones = resumen.meses.filter((m) => m.mes >= desde && m.mes <= hasta && m.estado === "por_pagar");
                          if (!opciones.length) return null;
                          return (
                            <div key={boleta.id} className="flex flex-wrap items-center gap-3">
                              <span className="w-16 font-heading font-bold tracking-widest">{formatoBoleta(boleta.numero, rifa.cifras)}</span>
                              {opciones.map((m) => (
                                <label key={m.mes} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm">
                                  <input
                                    type="checkbox"
                                    name="cuota"
                                    value={`${boleta.id}:${m.mes}`}
                                    defaultChecked={m.mes === desde}
                                    className="accent-[var(--oro)]"
                                  />
                                  Mes {m.mes}
                                  {m.mes === desde ? " (actual)" : ""}
                                </label>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                      <BotonEnviar className="fondo-oro w-fit" size="lg" pendienteTexto="Creando solicitud...">
                        Pagar cuotas seleccionadas
                      </BotonEnviar>
                    </FormAccion>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {rifasAbiertas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Rifas disponibles</h2>
          <div className="flex flex-wrap gap-2">
            {rifasAbiertas.map((r) => (
              <Link key={r.id} href={`/rifas/${r.slug}`} className={buttonVariants({ variant: "outline" })}>
                Comprar en {r.nombre}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
