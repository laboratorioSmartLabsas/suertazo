import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { TituloAdmin } from "@/components/admin/titulo";
import { guardarAjustes } from "@/app/acciones/admin";
import { obtenerAjustes } from "@/lib/rifas";

export const metadata: Metadata = { title: "Ajustes" };

function Campo({ id, etiqueta, ayuda, ...props }: { id: string; etiqueta: string; ayuda?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input id={id} name={id} {...props} />
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

export default async function Ajustes() {
  const c = await obtenerAjustes();
  return (
    <>
      <TituloAdmin titulo="Ajustes" descripcion="Información del inicio, pagos y reglas de comisiones." />
      <FormAccion accion={guardarAjustes} className="flex flex-col gap-6">
        <Card className="borde-oro border">
          <CardHeader>
            <CardTitle>Información del inicio</CardTitle>
            <CardDescription>Lo que ve cualquier persona al entrar a Suertazo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Campo id="inicioTitulo" etiqueta="Título principal" defaultValue={c.inicioTitulo} required />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inicioTexto">Texto del inicio</Label>
              <Textarea id="inicioTexto" name="inicioTexto" defaultValue={c.inicioTexto} rows={4} required />
            </div>
            <Campo id="anuncio" etiqueta="Anuncio en la franja superior (opcional)" defaultValue={c.anuncio ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="whatsapp" etiqueta="WhatsApp de contacto" defaultValue={c.whatsapp ?? ""} placeholder="+57 300 000 0000" />
              <Campo id="correoContacto" etiqueta="Correo de contacto" type="email" defaultValue={c.correoContacto ?? ""} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pagos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Campo id="nombrePasarela" etiqueta="Nombre de la pasarela" defaultValue={c.nombrePasarela} required />
            <Campo
              id="horasReserva"
              etiqueta="Horas de reserva de números"
              type="number"
              min={1}
              max={720}
              defaultValue={c.horasReserva}
              ayuda="Tiempo que tienes para verificar el pago antes de liberar los números."
            />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="instruccionesPago">Instrucciones de pago</Label>
              <Textarea id="instruccionesPago" name="instruccionesPago" defaultValue={c.instruccionesPago ?? ""} rows={3} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comisiones de referidos</CardTitle>
            <CardDescription>
              La bolsa de comisión es un porcentaje de cada pago aprobado y se reparte por líneas. Lo que no se asigna a ninguna línea queda para la casa.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Campo id="comisionPorcentaje" etiqueta="Bolsa de comisión (% de la venta)" type="number" min={0} max={100} defaultValue={c.comisionPorcentaje} />
            <Campo
              id="nivelesComision"
              etiqueta="Reparto por línea (% de la bolsa)"
              defaultValue={c.nivelesComision.join(", ")}
              ayuda="Separados por comas, de la línea 1 a la última."
            />
            <Campo id="retiroMinimo" etiqueta="Retiro mínimo (COP)" type="number" min={0} step={1000} defaultValue={c.retiroMinimo} />
          </CardContent>
        </Card>
        <BotonEnviar className="fondo-oro w-fit" size="lg">Guardar ajustes</BotonEnviar>
      </FormAccion>
    </>
  );
}
