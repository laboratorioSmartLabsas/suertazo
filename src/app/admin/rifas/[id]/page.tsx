import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { FormularioRifa } from "@/components/admin/formulario-rifa";
import { TituloAdmin } from "@/components/admin/titulo";
import { ProgresoRifa } from "@/components/rifa/progreso-rifa";
import { agregarPremio, eliminarPremio, iniciarCuentaRegresivaAccion } from "@/app/acciones/admin";
import { rifaPorId } from "@/lib/consultas";
import { formatoFecha, hoyColombia, sumarMeses } from "@/lib/fechas";
import { formatoPesos } from "@/lib/formato";

export const metadata: Metadata = { title: "Editar rifa" };

export default async function EditarRifa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rifa = await rifaPorId(Number(id));
  if (!rifa) notFound();

  return (
    <>
      <TituloAdmin
        titulo={rifa.nombre}
        descripcion="Configuración, premios y fase de la rifa."
        acciones={
          <Link href={`/admin/rifas/${rifa.id}/sorteos`} className={buttonVariants({ className: "fondo-oro" })}>
            Sorteos y resultados
          </Link>
        }
      />

      <Card className="borde-oro border">
        <CardHeader>
          <CardTitle>Preventa y fecha de inicio</CardTitle>
          <CardDescription>
            El sistema fija automáticamente la fecha de inicio cuando se vende el {rifa.porcentajePreventa}% de la boletería (
            {rifa.meta.toLocaleString("es-CO")} boletas) y genera el calendario de sorteos {rifa.mesesEspera}{" "}
            {rifa.mesesEspera === 1 ? "mes" : "meses"} después.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProgresoRifa vendidas={rifa.vendidas} total={rifa.total} meta={rifa.meta} porcentajeMeta={rifa.porcentajePreventa} />
          {rifa.fechaInicioSorteos ? (
            <p className="text-sm text-emerald-300">Los sorteos inician el {formatoFecha(rifa.fechaInicioSorteos)}.</p>
          ) : (
            <FormAccion
              accion={iniciarCuentaRegresivaAccion.bind(null, rifa.id)}
              confirmar={`¿Fijar ya la fecha de inicio? Los sorteos empezarán el ${formatoFecha(sumarMeses(hoyColombia(), rifa.mesesEspera))}. Esta acción no se puede deshacer.`}
            >
              <BotonEnviar variant="outline" pendienteTexto="Generando calendario...">
                Fijar fecha de inicio ahora (sin esperar la meta)
              </BotonEnviar>
            </FormAccion>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Premios</CardTitle>
          <CardDescription>
            Los premios especiales con «día del sorteo» se agregan al calendario cuando se fija la fecha de inicio. También puedes programarlos a mano
            desde el calendario.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ul className="flex flex-col gap-2">
            {rifa.premios.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/30 p-3">
                <div>
                  <p className="font-semibold">
                    {p.titulo} <Badge variant="outline" className="ml-1">{p.tipo === "diario" ? "Diario" : "Especial"}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.valor ? formatoPesos(p.valor) : "Premio en especie"}
                    {p.diaSorteo ? ` · día ${p.diaSorteo} del calendario` : ""}
                  </p>
                </div>
                <FormAccion accion={eliminarPremio.bind(null, p.id)} confirmar={`¿Eliminar el premio ${p.titulo}?`}>
                  <BotonEnviar variant="ghost" size="sm" pendienteTexto="...">
                    <Trash2 data-icon="inline-start" /> Eliminar
                  </BotonEnviar>
                </FormAccion>
              </li>
            ))}
          </ul>
          <FormAccion accion={agregarPremio.bind(null, rifa.id)} reiniciar className="grid gap-3 rounded-xl border border-dashed borde-oro p-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="titulo">Premio</Label>
              <Input id="titulo" name="titulo" placeholder="Yamaha NMAX 0 km" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <NativeSelect id="tipo" name="tipo" defaultValue="especial" className="w-full">
                <NativeSelectOption value="especial">Especial (un solo sorteo)</NativeSelectOption>
                <NativeSelectOption value="diario">Diario</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valor">Valor en pesos (0 si es en especie)</Label>
              <Input id="valor" name="valor" type="number" min={0} defaultValue={0} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diaSorteo">Día del calendario en que se juega</Label>
              <Input id="diaSorteo" name="diaSorteo" type="number" min={1} placeholder="Ej. 180" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="descripcion-premio">Descripción</Label>
              <Input id="descripcion-premio" name="descripcion" />
            </div>
            <BotonEnviar variant="outline" className="w-fit">Agregar premio</BotonEnviar>
          </FormAccion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioRifa rifa={rifa} />
        </CardContent>
      </Card>
    </>
  );
}
