import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { solicitarRetiro } from "@/app/acciones/cuenta";
import { db } from "@/db";
import { comisiones, retiros } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { formatoFechaHora } from "@/lib/fechas";
import { formatoPesos } from "@/lib/formato";
import { obtenerAjustes, saldoBilletera } from "@/lib/rifas";

export const metadata: Metadata = { title: "Billetera" };

const ESTADO_RETIRO = {
  solicitado: { texto: "En proceso", variante: "outline" as const },
  pagado: { texto: "Pagado", variante: "default" as const },
  rechazado: { texto: "Rechazado", variante: "destructive" as const },
};

export default async function Billetera() {
  const usuario = await requerirUsuario("/cuenta/billetera");
  const [saldo, config, lista, historial, porNivel] = await Promise.all([
    saldoBilletera(usuario.id),
    obtenerAjustes(),
    db.select().from(comisiones).where(eq(comisiones.beneficiarioId, usuario.id)).orderBy(desc(comisiones.creadoEn)).limit(100),
    db.select().from(retiros).where(eq(retiros.usuarioId, usuario.id)).orderBy(desc(retiros.creadoEn)).limit(50),
    db
      .select({ nivel: comisiones.nivel, total: sql<number>`sum(${comisiones.monto})::int` })
      .from(comisiones)
      .where(eq(comisiones.beneficiarioId, usuario.id))
      .groupBy(comisiones.nivel),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { t: "Disponible", v: saldo.disponible, clase: "texto-oro" },
          { t: "Ganado en total", v: saldo.ganado, clase: "" },
          { t: "Retiros en proceso", v: saldo.enProceso, clase: "" },
          { t: "Pagado a ti", v: saldo.pagado, clase: "text-emerald-300" },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border borde-oro bg-card/70 p-4">
            <p className="text-sm text-muted-foreground">{c.t}</p>
            <p className={`mt-1 text-2xl font-bold ${c.clase}`}>{formatoPesos(c.v)}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="borde-oro border">
          <CardHeader>
            <CardTitle>Solicitar retiro</CardTitle>
            <CardDescription>Retiro mínimo {formatoPesos(config.retiroMinimo)}. El máster realiza la transferencia y te notifica.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormAccion accion={solicitarRetiro} reiniciar className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="monto">Monto</Label>
                <Input id="monto" name="monto" type="number" min={config.retiroMinimo} max={saldo.disponible} step={1000} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="datosPago">Cuenta para el pago</Label>
                <Textarea id="datosPago" name="datosPago" placeholder="Nequi 3001234567 a nombre de ..." required minLength={8} />
              </div>
              <BotonEnviar className="fondo-oro" size="lg" disabled={saldo.disponible < config.retiroMinimo} pendienteTexto="Enviando...">
                Solicitar retiro
              </BotonEnviar>
              {saldo.disponible < config.retiroMinimo && (
                <p className="text-xs text-muted-foreground">Aún no alcanzas el monto mínimo de retiro.</p>
              )}
            </FormAccion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comisiones por línea</CardTitle>
            <CardDescription>
              Ganas el {config.comisionPorcentaje}% de cada pago aprobado en tu red, repartido así: {config.nivelesComision.map((n, i) => `línea ${i + 1} ${n}%`).join(" · ")}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {config.nivelesComision.map((p, i) => (
              <div key={i} className="rounded-xl bg-black/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Línea {i + 1}</p>
                <p className="font-bold">{formatoPesos(porNivel.find((n) => n.nivel === i + 1)?.total ?? 0)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de comisiones</CardTitle>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no tienes comisiones. Comparte tu link de referido para empezar a ganar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Línea</TableHead>
                  <TableHead className="text-right">Venta</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">{formatoFechaHora(c.creadoEn)}</TableCell>
                    <TableCell>{c.compradorNombre}</TableCell>
                    <TableCell>
                      {c.nivel} ({c.porcentajeNivel}%)
                    </TableCell>
                    <TableCell className="text-right">{formatoPesos(c.baseVenta)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatoPesos(c.monto)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {historial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mis retiros</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {historial.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{formatoPesos(r.monto)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatoFechaHora(r.creadoEn)} · {r.datosPago}
                      {r.nota ? ` · ${r.nota}` : ""}
                    </p>
                  </div>
                  <Badge variant={ESTADO_RETIRO[r.estado].variante}>{ESTADO_RETIRO[r.estado].texto}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
