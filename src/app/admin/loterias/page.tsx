import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { TituloAdmin } from "@/components/admin/titulo";
import { alternarLoteria, crearLoteria } from "@/app/acciones/admin";
import { db } from "@/db";
import { loterias } from "@/db/schema";

export const metadata: Metadata = { title: "Loterías" };

export default async function LoteriasAdmin() {
  const lista = await db.select().from(loterias).orderBy(asc(loterias.nombre));
  return (
    <>
      <TituloAdmin titulo="Loterías" descripcion="Loterías con las que se juegan los sorteos. Se sugieren según el día de juego." />
      <Card className="borde-oro border">
        <CardHeader>
          <CardTitle>Registrar lotería</CardTitle>
        </CardHeader>
        <CardContent>
          <FormAccion accion={crearLoteria} reiniciar className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required className="w-64" placeholder="Lotería de ..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diaJuego">Día de juego</Label>
              <Input id="diaJuego" name="diaJuego" className="w-40" placeholder="Viernes" />
            </div>
            <BotonEnviar className="fondo-oro">Agregar</BotonEnviar>
          </FormAccion>
        </CardContent>
      </Card>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card/70 p-3">
            <div>
              <p className="font-medium">{l.nombre}</p>
              <p className="text-xs text-muted-foreground">{l.diaJuego ?? "Sin día fijo"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={l.activa ? "default" : "outline"}>{l.activa ? "Activa" : "Inactiva"}</Badge>
              <FormAccion accion={alternarLoteria.bind(null, l.id)}>
                <BotonEnviar size="xs" variant="ghost" pendienteTexto="...">
                  {l.activa ? "Desactivar" : "Activar"}
                </BotonEnviar>
              </FormAccion>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
