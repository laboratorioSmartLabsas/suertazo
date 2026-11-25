import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kpi, TituloAdmin } from "@/components/admin/titulo";
import { InsigniaFase } from "@/components/rifa/insignia-fase";
import { ProgresoRifa } from "@/components/rifa/progreso-rifa";
import { db } from "@/db";
import { comisiones, loterias, ordenes, retiros, rifas, sorteos, usuarios } from "@/db/schema";
import { todasLasRifas } from "@/lib/consultas";
import { formatoFecha, formatoFechaCorta, hoyColombia } from "@/lib/fechas";
import { formatoNumero, formatoPesos } from "@/lib/formato";
import { ejecutarTareas } from "@/lib/rifas";

export default async function ResumenAdmin() {
  await ejecutarTareas();
  const hoy = hoyColombia();
  const [listaRifas, [ventas], [pend], [com], [ret], [usu], sorteosHoy] = await Promise.all([
    todasLasRifas(),
    db
      .select({ total: sql<number>`coalesce(sum(${ordenes.total}),0)::int`, cantidad: sql<number>`count(*)::int` })
      .from(ordenes)
      .where(eq(ordenes.estado, "aprobada")),
    db
      .select({ total: sql<number>`coalesce(sum(${ordenes.total}),0)::int`, cantidad: sql<number>`count(*)::int` })
      .from(ordenes)
      .where(eq(ordenes.estado, "pendiente")),
    db.select({ total: sql<number>`coalesce(sum(${comisiones.monto}),0)::int` }).from(comisiones),
    db
      .select({ total: sql<number>`coalesce(sum(${retiros.monto}),0)::int`, cantidad: sql<number>`count(*)::int` })
      .from(retiros)
      .where(eq(retiros.estado, "solicitado")),
    db.select({ total: sql<number>`count(*)::int` }).from(usuarios),
    db
      .select({ sorteo: sorteos, rifaNombre: rifas.nombre, loteria: loterias.nombre })
      .from(sorteos)
      .innerJoin(rifas, eq(rifas.id, sorteos.rifaId))
      .leftJoin(loterias, eq(loterias.id, sorteos.loteriaId))
      .where(and(eq(sorteos.estado, "programado"), sql`${sorteos.fecha} <= ${hoy}`))
      .orderBy(asc(sorteos.fecha))
      .limit(10),
  ]);

  return (
    <>
      <TituloAdmin titulo="Resumen" descripcion={`Hoy es ${formatoFecha(hoy)}.`} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Ventas aprobadas" valor={formatoPesos(ventas.total)} detalle={`${formatoNumero(ventas.cantidad)} pagos`} />
        <Kpi
          titulo="Pagos por verificar"
          valor={formatoNumero(pend.cantidad)}
          detalle={<Link href="/admin/ventas" className="text-primary hover:underline">{formatoPesos(pend.total)} en revisión</Link>}
        />
        <Kpi titulo="Comisiones generadas" valor={formatoPesos(com.total)} detalle={`${formatoNumero(ret.cantidad)} retiros por pagar (${formatoPesos(ret.total)})`} />
        <Kpi titulo="Usuarios registrados" valor={formatoNumero(usu.total)} />
      </section>

      <Card className="borde-oro border">
        <CardHeader>
          <CardTitle>Sorteos por publicar</CardTitle>
        </CardHeader>
        <CardContent>
          {sorteosHoy.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay sorteos pendientes de resultado para hoy.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {sorteosHoy.map(({ sorteo, rifaNombre, loteria }) => (
                <li key={sorteo.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{sorteo.titulo} · {rifaNombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatoFechaCorta(sorteo.fecha)} · {loteria ?? "Sin lotería asignada"}
                    </p>
                  </div>
                  <Link href={`/admin/rifas/${sorteo.rifaId}/sorteos`} className={buttonVariants({ size: "sm", className: "fondo-oro" })}>
                    Publicar resultado
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        {listaRifas.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{r.nombre}</CardTitle>
                <InsigniaFase fase={r.fase} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ProgresoRifa vendidas={r.vendidas} total={r.total} meta={r.meta} porcentajeMeta={r.porcentajePreventa} />
              <p className="text-sm text-muted-foreground">
                {formatoNumero(r.reservadas)} boletas reservadas en espera de aprobación.
                {r.fechaInicioSorteos ? ` Sorteos desde el ${formatoFecha(r.fechaInicioSorteos)}.` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/rifas/${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Editar rifa
                </Link>
                <Link href={`/admin/rifas/${r.id}/sorteos`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Calendario de sorteos
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}
