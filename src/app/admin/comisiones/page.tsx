import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { Kpi, TituloAdmin } from "@/components/admin/titulo";
import { procesarRetiro } from "@/app/acciones/admin";
import { db } from "@/db";
import { comisiones, ordenes, retiros, usuarios } from "@/db/schema";
import { formatoFechaHora } from "@/lib/fechas";
import { formatoPesos } from "@/lib/formato";

export const metadata: Metadata = { title: "Comisiones" };

export default async function ComisionesAdmin() {
  const [solicitudes, recientes, ranking, [totales]] = await Promise.all([
    db
      .select({ retiro: retiros, nombre: usuarios.nombre, email: usuarios.email, telefono: usuarios.telefono })
      .from(retiros)
      .innerJoin(usuarios, eq(usuarios.id, retiros.usuarioId))
      .orderBy(desc(retiros.creadoEn))
      .limit(100),
    db
      .select({ comision: comisiones, beneficiario: usuarios.nombre, referencia: ordenes.referencia })
      .from(comisiones)
      .innerJoin(usuarios, eq(usuarios.id, comisiones.beneficiarioId))
      .innerJoin(ordenes, eq(ordenes.id, comisiones.ordenId))
      .orderBy(desc(comisiones.creadoEn))
      .limit(100),
    db
      .select({ nombre: usuarios.nombre, total: sql<number>`sum(${comisiones.monto})::int` })
      .from(comisiones)
      .innerJoin(usuarios, eq(usuarios.id, comisiones.beneficiarioId))
      .groupBy(usuarios.id, usuarios.nombre)
      .orderBy(desc(sql`sum(${comisiones.monto})`))
      .limit(10),
    db
      .select({
        generado: sql<number>`(select coalesce(sum(monto),0) from comisiones)::int`,
        pagado: sql<number>`(select coalesce(sum(monto),0) from retiros where estado = 'pagado')::int`,
        solicitado: sql<number>`(select coalesce(sum(monto),0) from retiros where estado = 'solicitado')::int`,
      })
      .from(sql`(select 1) as t`),
  ]);
  const pendientes = solicitudes.filter((s) => s.retiro.estado === "solicitado");

  return (
    <>
      <TituloAdmin titulo="Comisiones y retiros" descripcion="Comisiones generadas por la red de referidos y solicitudes de retiro de las billeteras." />
      <section className="grid gap-3 sm:grid-cols-4">
        <Kpi titulo="Comisiones generadas" valor={formatoPesos(totales.generado)} />
        <Kpi titulo="Retiros por pagar" valor={formatoPesos(totales.solicitado)} detalle={`${pendientes.length} solicitudes`} />
        <Kpi titulo="Retiros pagados" valor={formatoPesos(totales.pagado)} />
        <Kpi titulo="Saldo en billeteras" valor={formatoPesos(totales.generado - totales.pagado - totales.solicitado)} />
      </section>

      <Card className="borde-oro border">
        <CardHeader>
          <CardTitle>Solicitudes de retiro</CardTitle>
        </CardHeader>
        <CardContent>
          {solicitudes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hay solicitudes de retiro.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {solicitudes.map(({ retiro, nombre, email, telefono }) => (
                <li key={retiro.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-sm">
                    <p className="font-semibold">
                      {formatoPesos(retiro.monto)} · {nombre}
                    </p>
                    <p className="text-muted-foreground">
                      {email} · {telefono} · {formatoFechaHora(retiro.creadoEn)}
                    </p>
                    <p className="text-muted-foreground">Cuenta: {retiro.datosPago}</p>
                  </div>
                  {retiro.estado === "solicitado" ? (
                    <div className="flex flex-wrap gap-2">
                      <FormAccion accion={procesarRetiro.bind(null, retiro.id, "pagado")} confirmar="¿Ya hiciste la transferencia?" className="flex gap-2">
                        <Input name="nota" placeholder="N.º de comprobante" className="w-40" />
                        <BotonEnviar className="bg-emerald-600 text-white hover:bg-emerald-500">Marcar pagado</BotonEnviar>
                      </FormAccion>
                      <FormAccion accion={procesarRetiro.bind(null, retiro.id, "rechazado")} confirmar="¿Rechazar este retiro?" className="flex gap-2">
                        <Input name="nota" placeholder="Motivo" className="w-32" />
                        <BotonEnviar variant="destructive">Rechazar</BotonEnviar>
                      </FormAccion>
                    </div>
                  ) : (
                    <Badge variant={retiro.estado === "pagado" ? "default" : "destructive"}>{retiro.estado}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top referidores</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin comisiones todavía.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {ranking.map((r, i) => (
                  <li key={r.nombre + i} className="flex justify-between">
                    <span>
                      {i + 1}. {r.nombre}
                    </span>
                    <span className="font-semibold text-primary">{formatoPesos(r.total)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comisiones recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin comisiones todavía.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beneficiario</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Línea</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recientes.map(({ comision, beneficiario, referencia }) => (
                    <TableRow key={comision.id}>
                      <TableCell>{beneficiario}</TableCell>
                      <TableCell>
                        {referencia} · {comision.compradorNombre}
                      </TableCell>
                      <TableCell>{comision.nivel}</TableCell>
                      <TableCell className="text-right font-semibold">{formatoPesos(comision.monto)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
