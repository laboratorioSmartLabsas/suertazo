import type { Metadata } from "next";
import Link from "next/link";
import { aliasedTable, and, desc, eq, ilike, or } from "drizzle-orm";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { TituloAdmin } from "@/components/admin/titulo";
import { aprobarOrdenAccion, rechazarOrdenAccion } from "@/app/acciones/admin";
import { db } from "@/db";
import { ordenes, rifas, usuarios } from "@/db/schema";
import { formatoFechaHora } from "@/lib/fechas";
import { formatoBoleta, formatoPesos } from "@/lib/formato";
import { vencerOrdenes } from "@/lib/rifas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ventas y pagos" };

const FILTROS = [
  { id: "pendiente", etiqueta: "Por verificar" },
  { id: "aprobada", etiqueta: "Aprobadas" },
  { id: "rechazada", etiqueta: "Rechazadas" },
  { id: "vencida", etiqueta: "Vencidas" },
  { id: "todas", etiqueta: "Todas" },
] as const;

const ESTILO_ESTADO = {
  pendiente: "fondo-oro",
  aprobada: "bg-emerald-600 text-white",
  rechazada: "bg-destructive/20 text-destructive",
  vencida: "bg-muted text-muted-foreground",
};

type Busqueda = { estado?: string; q?: string };

export default async function Ventas({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { estado = "pendiente", q = "" } = await searchParams;
  await vencerOrdenes();
  const referidor = aliasedTable(usuarios, "referidor");
  const filtroEstado = FILTROS.some((f) => f.id === estado) && estado !== "todas" ? (estado as "pendiente") : null;
  const texto = q.trim();
  const lista = await db
    .select({ orden: ordenes, rifa: rifas, comprador: usuarios.nombre, referidor: referidor.nombre })
    .from(ordenes)
    .innerJoin(rifas, eq(rifas.id, ordenes.rifaId))
    .leftJoin(usuarios, eq(usuarios.id, ordenes.usuarioId))
    .leftJoin(referidor, eq(referidor.id, ordenes.referidorId))
    .where(
      and(
        texto ? undefined : filtroEstado ? eq(ordenes.estado, filtroEstado) : undefined,
        texto
          ? or(
              ilike(ordenes.referencia, `%${texto}%`),
              ilike(ordenes.emailContacto, `%${texto}%`),
              ilike(ordenes.nombreContacto, `%${texto}%`),
              ilike(ordenes.telefonoContacto, `%${texto}%`),
            )
          : undefined,
      ),
    )
    .orderBy(estado === "pendiente" && !texto ? ordenes.creadoEn : desc(ordenes.creadoEn))
    .limit(150);

  return (
    <>
      <TituloAdmin
        titulo="Ventas y pagos"
        descripcion="Cada solicitud se crea cuando la persona va al link de pago. Verifica en el banco que el dinero entró antes de aprobar."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <Link
              key={f.id}
              href={`/admin/ventas?estado=${f.id}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm",
                estado === f.id && !texto ? "fondo-oro font-semibold" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.etiqueta}
            </Link>
          ))}
        </div>
        <form className="flex gap-2" action="/admin/ventas">
          <Input name="q" defaultValue={texto} placeholder="Referencia, correo, nombre o celular" className="w-72" />
          <Button type="submit" variant="outline">Buscar</Button>
        </form>
      </div>

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {texto ? "No encontramos solicitudes con esa búsqueda." : "No hay solicitudes en este estado."}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map(({ orden, rifa, comprador, referidor: nombreReferidor }) => (
            <li key={orden.id}>
              <Card className={orden.estado === "pendiente" ? "border border-primary/40" : ""}>
                <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-lg font-bold tracking-widest">{orden.referencia}</span>
                      <Badge className={cn("border-transparent", ESTILO_ESTADO[orden.estado])}>{orden.estado}</Badge>
                      <Badge variant="outline">
                        {orden.tipo === "cuota" ? "Pago de cuotas" : orden.plan === "cuotas" ? `Compra · cuota mes ${orden.mes ?? 1}` : "Compra de contado"}
                      </Badge>
                      {!orden.usuarioId && <Badge variant="destructive">Sin registrarse</Badge>}
                    </div>
                    <p className="text-sm">
                      <strong>{comprador ?? orden.nombreContacto}</strong> · {orden.emailContacto} ·{" "}
                      <a href={`https://wa.me/${orden.telefonoContacto.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {orden.telefonoContacto}
                      </a>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {rifa.nombre} ·{" "}
                      {orden.tipo === "cuota"
                        ? (orden.detalle ?? []).map((d) => `${formatoBoleta(d.numero, rifa.cifras)} (mes ${d.mes})`).join(", ")
                        : orden.numeros.map((n) => formatoBoleta(n, rifa.cifras)).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solicitada {formatoFechaHora(orden.creadoEn)}
                      {orden.estado === "pendiente" ? ` · reserva hasta ${formatoFechaHora(orden.venceEn)}` : ""}
                      {orden.revisadoEn ? ` · revisada ${formatoFechaHora(orden.revisadoEn)}` : ""}
                      {nombreReferidor ? ` · referido por ${nombreReferidor}` : ""}
                    </p>
                    {orden.notaAdmin && <p className="text-xs text-destructive">Nota: {orden.notaAdmin}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-3 lg:items-end">
                    <span className="texto-oro text-2xl font-bold">{formatoPesos(orden.total)}</span>
                    {(orden.estado === "pendiente" || orden.estado === "vencida") && (
                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                        <FormAccion
                          accion={aprobarOrdenAccion.bind(null, orden.id)}
                          confirmar={`¿Confirmas que el pago de ${formatoPesos(orden.total)} con referencia ${orden.referencia} entró al banco?`}
                        >
                          <BotonEnviar className="bg-emerald-600 text-white hover:bg-emerald-500" pendienteTexto="Aprobando...">
                            <Check data-icon="inline-start" /> Aprobar pago
                          </BotonEnviar>
                        </FormAccion>
                        <FormAccion accion={rechazarOrdenAccion.bind(null, orden.id)} confirmar="¿Rechazar esta solicitud? Los números se liberarán." className="flex gap-2">
                          <Input name="nota" placeholder="Motivo (opcional)" className="w-40" />
                          <BotonEnviar variant="destructive" pendienteTexto="Rechazando...">
                            <X data-icon="inline-start" /> Rechazar
                          </BotonEnviar>
                        </FormAccion>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
