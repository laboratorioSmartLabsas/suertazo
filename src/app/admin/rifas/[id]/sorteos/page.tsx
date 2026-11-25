import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { TituloAdmin } from "@/components/admin/titulo";
import { crearSorteoEspecial, programarSorteo, publicarResultadoAccion } from "@/app/acciones/admin";
import { db } from "@/db";
import { loterias, sorteos } from "@/db/schema";
import { rifaPorId } from "@/lib/consultas";
import { periodoDe } from "@/lib/cuotas";
import { formatoFecha, hoyColombia } from "@/lib/fechas";
import { formatoBoleta, formatoPesos } from "@/lib/formato";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sorteos" };

const VISTAS = [
  { id: "pendientes", etiqueta: "Por publicar" },
  { id: "proximos", etiqueta: "Próximos" },
  { id: "publicados", etiqueta: "Publicados" },
] as const;

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function SorteosRifa({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ver?: string }>;
}) {
  const { id } = await params;
  const { ver = "pendientes" } = await searchParams;
  const rifa = await rifaPorId(Number(id));
  if (!rifa) notFound();
  const hoy = hoyColombia();

  const condicion =
    ver === "publicados"
      ? and(eq(sorteos.rifaId, rifa.id), eq(sorteos.estado, "publicado"))
      : ver === "proximos"
        ? and(eq(sorteos.rifaId, rifa.id), eq(sorteos.estado, "programado"), gt(sorteos.fecha, hoy))
        : and(eq(sorteos.rifaId, rifa.id), eq(sorteos.estado, "programado"), lte(sorteos.fecha, hoy));

  const [lista, listaLoterias, [conteo]] = await Promise.all([
    db
      .select({ sorteo: sorteos, loteria: loterias.nombre })
      .from(sorteos)
      .leftJoin(loterias, eq(loterias.id, sorteos.loteriaId))
      .where(condicion)
      .orderBy(ver === "publicados" ? desc(sorteos.fecha) : asc(sorteos.fecha), asc(sorteos.id))
      .limit(ver === "proximos" ? 40 : 60),
    db.select().from(loterias).where(eq(loterias.activa, true)).orderBy(asc(loterias.nombre)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        publicados: sql<number>`count(*) filter (where ${sorteos.estado} = 'publicado')::int`,
      })
      .from(sorteos)
      .where(eq(sorteos.rifaId, rifa.id)),
  ]);
  const especiales = rifa.premios.filter((p) => p.tipo === "especial");

  return (
    <>
      <TituloAdmin
        titulo={`Sorteos · ${rifa.nombre}`}
        descripcion={
          rifa.fechaInicioSorteos
            ? `Inician el ${formatoFecha(rifa.fechaInicioSorteos)} · ${conteo.publicados} de ${conteo.total} sorteos publicados.`
            : `El calendario se genera al alcanzar el ${rifa.porcentajePreventa}% de ventas.`
        }
      />

      <div className="flex flex-wrap gap-1">
        {VISTAS.map((v) => (
          <Link
            key={v.id}
            href={`/admin/rifas/${rifa.id}/sorteos?ver=${v.id}`}
            className={cn("rounded-lg px-3 py-1.5 text-sm", ver === v.id ? "fondo-oro font-semibold" : "text-muted-foreground hover:bg-muted")}
          >
            {v.etiqueta}
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {ver === "pendientes"
              ? "No hay sorteos pendientes de resultado."
              : ver === "proximos"
                ? "No hay sorteos programados."
                : "Aún no hay resultados publicados."}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map(({ sorteo, loteria }) => {
            const dia = DIAS[new Date(`${sorteo.fecha}T12:00:00Z`).getUTCDay()];
            const mes = rifa.fechaInicioSorteos ? periodoDe(rifa.fechaInicioSorteos, sorteo.fecha) : null;
            const sugeridas = listaLoterias.filter((l) => l.diaJuego === dia);
            const otras = listaLoterias.filter((l) => l.diaJuego !== dia);
            return (
              <li key={sorteo.id}>
                <Card className={sorteo.premioId && sorteo.valorPremio !== rifa.premioDiario ? "border border-emerald-600/60" : ""}>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{sorteo.titulo}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatoFecha(sorteo.fecha)}
                          {mes ? ` · mes ${mes}` : ""} · {sorteo.valorPremio ? formatoPesos(sorteo.valorPremio) : "Premio en especie"}
                        </p>
                      </div>
                      {sorteo.estado === "publicado" ? (
                        <div className="flex items-center gap-3">
                          <span className="fondo-oro rounded-lg px-3 py-1 font-heading font-bold tracking-widest">
                            {formatoBoleta(sorteo.numeroGanador ?? 0, rifa.cifras)}
                          </span>
                          <div className="text-right text-sm">
                            <p>{sorteo.ganadorNombre ?? (sorteo.boletaSinCuota ? "Boleta sin cuota del mes" : "Número no vendido")}</p>
                            <p className="text-xs text-muted-foreground">{loteria}</p>
                          </div>
                          {sorteo.ganadorNombre && (
                            <Badge variant={sorteo.pagado ? "default" : "outline"}>{sorteo.pagado ? "Entregado" : "Por entregar"}</Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline">{loteria ?? "Sin lotería"}</Badge>
                      )}
                    </div>

                    {sorteo.estado === "programado" && (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <FormAccion accion={programarSorteo.bind(null, sorteo.id)} className="flex flex-wrap items-end gap-2 rounded-xl bg-black/30 p-3">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`loteria-${sorteo.id}`}>Lotería del día</Label>
                            <NativeSelect id={`loteria-${sorteo.id}`} name="loteriaId" defaultValue={sorteo.loteriaId ?? ""} className="w-56">
                              <NativeSelectOption value="">Sin asignar</NativeSelectOption>
                              {sugeridas.length > 0 && (
                                <optgroup label={`Juegan el ${dia.toLowerCase()}`}>
                                  {sugeridas.map((l) => (
                                    <NativeSelectOption key={l.id} value={l.id}>{l.nombre}</NativeSelectOption>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="Otras loterías">
                                {otras.map((l) => (
                                  <NativeSelectOption key={l.id} value={l.id}>{l.nombre}</NativeSelectOption>
                                ))}
                              </optgroup>
                            </NativeSelect>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`fecha-${sorteo.id}`}>Fecha</Label>
                            <Input id={`fecha-${sorteo.id}`} name="fecha" type="date" defaultValue={sorteo.fecha} className="w-40" />
                          </div>
                          <BotonEnviar variant="outline">Guardar</BotonEnviar>
                        </FormAccion>
                        {sorteo.fecha <= hoy && (
                          <FormAccion
                            accion={publicarResultadoAccion.bind(null, sorteo.id)}
                            confirmar="¿Publicar este resultado? Se notificará a todos los usuarios y no se puede modificar."
                            className="flex flex-wrap items-end gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3"
                          >
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`numero-${sorteo.id}`}>Número ganador ({rifa.cifras} cifras)</Label>
                              <Input
                                id={`numero-${sorteo.id}`}
                                name="numero"
                                inputMode="numeric"
                                pattern={`\\d{${rifa.cifras}}`}
                                maxLength={rifa.cifras}
                                required
                                className="w-32 text-center font-heading tracking-[0.3em]"
                                disabled={!sorteo.loteriaId}
                              />
                            </div>
                            <BotonEnviar className="fondo-oro" disabled={!sorteo.loteriaId} pendienteTexto="Publicando...">
                              Publicar resultado
                            </BotonEnviar>
                            {!sorteo.loteriaId && <p className="w-full text-xs text-muted-foreground">Asigna primero la lotería del día.</p>}
                          </FormAccion>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {especiales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Programar un sorteo especial</CardTitle>
            <CardDescription>Para premios mayores como el lote o la moto, en la fecha que decidas.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormAccion accion={crearSorteoEspecial.bind(null, rifa.id)} reiniciar className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="premioId">Premio</Label>
                <NativeSelect id="premioId" name="premioId" className="w-56">
                  {especiales.map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>{p.titulo}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fecha-especial">Fecha</Label>
                <Input id="fecha-especial" name="fecha" type="date" min={hoy} required className="w-44" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loteria-especial">Lotería</Label>
                <NativeSelect id="loteria-especial" name="loteriaId" className="w-56">
                  <NativeSelectOption value="">Asignar después</NativeSelectOption>
                  {listaLoterias.map((l) => (
                    <NativeSelectOption key={l.id} value={l.id}>{l.nombre}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <BotonEnviar variant="outline">Programar</BotonEnviar>
            </FormAccion>
          </CardContent>
        </Card>
      )}
    </>
  );
}
