import type { Metadata } from "next";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { Kpi, TituloAdmin } from "@/components/admin/titulo";
import { marcarPremioPagado } from "@/app/acciones/admin";
import { db } from "@/db";
import { loterias, rifas, sorteos, usuarios } from "@/db/schema";
import { formatoFechaCorta } from "@/lib/fechas";
import { formatoBoleta, formatoPesos } from "@/lib/formato";

export const metadata: Metadata = { title: "Premiaciones" };

export default async function PremiosAdmin() {
  const lista = await db
    .select({ sorteo: sorteos, rifa: rifas.nombre, cifras: rifas.cifras, loteria: loterias.nombre, telefono: usuarios.telefono })
    .from(sorteos)
    .innerJoin(rifas, eq(rifas.id, sorteos.rifaId))
    .leftJoin(loterias, eq(loterias.id, sorteos.loteriaId))
    .leftJoin(usuarios, eq(usuarios.id, sorteos.ganadorUsuarioId))
    .where(and(eq(sorteos.estado, "publicado"), isNotNull(sorteos.ganadorNombre)))
    .orderBy(desc(sorteos.fecha))
    .limit(200);
  const porEntregar = lista.filter((l) => !l.sorteo.pagado);

  return (
    <>
      <TituloAdmin titulo="Premiaciones" descripcion="Ganadores de los sorteos publicados y control de entrega de premios." />
      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi titulo="Ganadores" valor={lista.length} />
        <Kpi titulo="Premios por entregar" valor={porEntregar.length} detalle={formatoPesos(porEntregar.reduce((s, l) => s + l.sorteo.valorPremio, 0))} />
        <Kpi titulo="Entregado" valor={formatoPesos(lista.filter((l) => l.sorteo.pagado).reduce((s, l) => s + l.sorteo.valorPremio, 0))} />
      </section>
      <Card>
        <CardContent>
          {lista.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Aún no hay ganadores.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sorteo</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Ganador</TableHead>
                  <TableHead className="text-right">Premio</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map(({ sorteo, rifa, cifras, loteria, telefono }) => (
                  <TableRow key={sorteo.id}>
                    <TableCell>
                      <p className="font-medium">{sorteo.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatoFechaCorta(sorteo.fecha)} · {loteria} · {rifa}
                      </p>
                    </TableCell>
                    <TableCell className="font-heading font-bold tracking-widest">{formatoBoleta(sorteo.numeroGanador ?? 0, cifras)}</TableCell>
                    <TableCell>
                      <p>{sorteo.ganadorNombre}</p>
                      <p className="text-xs text-muted-foreground">{telefono ?? "Sin cuenta"}</p>
                    </TableCell>
                    <TableCell className="text-right">{sorteo.valorPremio ? formatoPesos(sorteo.valorPremio) : "En especie"}</TableCell>
                    <TableCell className="text-right">
                      {sorteo.pagado ? (
                        <Badge>Entregado</Badge>
                      ) : (
                        <FormAccion accion={marcarPremioPagado.bind(null, sorteo.id)} confirmar="¿Confirmas que el premio fue entregado al ganador?">
                          <BotonEnviar size="sm" className="fondo-oro" pendienteTexto="...">
                            Marcar entregado
                          </BotonEnviar>
                        </FormAccion>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
