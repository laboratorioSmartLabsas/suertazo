import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { guardarRifa } from "@/app/acciones/admin";
import type { Rifa } from "@/db/schema";

function Campo({
  id,
  etiqueta,
  ayuda,
  className,
  ...props
}: { id: string; etiqueta: string; ayuda?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input id={id} name={id} {...props} />
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

export function FormularioRifa({ rifa }: { rifa?: Rifa }) {
  return (
    <FormAccion accion={guardarRifa.bind(null, rifa?.id ?? null)} className="grid gap-4 sm:grid-cols-2">
      <Campo id="nombre" etiqueta="Nombre" defaultValue={rifa?.nombre} required />
      <Campo id="slug" etiqueta="Identificador en la URL" defaultValue={rifa?.slug} required ayuda="Ejemplo: gran-rifa-suertazo" />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea id="descripcion" name="descripcion" defaultValue={rifa?.descripcion} rows={4} required />
      </div>
      <Campo id="precioBoleta" etiqueta="Precio de contado (COP)" type="number" min={1000} step={1000} defaultValue={rifa?.precioBoleta ?? 150000} required />
      <Campo
        id="valorCuota"
        etiqueta="Valor de la cuota mensual (COP)"
        type="number"
        min={0}
        step={1000}
        defaultValue={rifa?.valorCuota ?? 15000}
        ayuda="0 para no permitir pago en cuotas."
      />
      <Campo id="cifras" etiqueta="Cifras por boleta" type="number" min={2} max={5} defaultValue={rifa?.cifras ?? 4} ayuda="4 cifras = 10.000 boletas (0000 a 9999)." />
      <Campo id="porcentajePreventa" etiqueta="Meta de preventa (%)" type="number" min={1} max={100} defaultValue={rifa?.porcentajePreventa ?? 30} />
      <Campo
        id="mesesEspera"
        etiqueta="Meses entre la meta y el primer sorteo"
        type="number"
        min={0}
        max={12}
        defaultValue={rifa?.mesesEspera ?? 1}
      />
      <Campo id="diasSorteo" etiqueta="Días de sorteos diarios" type="number" min={0} max={1000} defaultValue={rifa?.diasSorteo ?? 365} />
      <Campo id="premioDiario" etiqueta="Premio diario (COP)" type="number" min={0} step={1000} defaultValue={rifa?.premioDiario ?? 1000000} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="estado">Estado</Label>
        <NativeSelect id="estado" name="estado" defaultValue={rifa?.estado ?? "borrador"} className="w-full">
          <NativeSelectOption value="borrador">Borrador (oculta)</NativeSelectOption>
          <NativeSelectOption value="activa">Activa (visible y en venta)</NativeSelectOption>
          <NativeSelectOption value="finalizada">Finalizada</NativeSelectOption>
        </NativeSelect>
      </div>
      <Campo
        id="linkPago"
        etiqueta="Link de pago (Wompi)"
        type="url"
        className="sm:col-span-2"
        defaultValue={rifa?.linkPago ?? ""}
        placeholder="https://checkout.wompi.co/l/..."
        ayuda="Usa un link de monto abierto para que la persona pague el total de su solicitud."
      />
      <Campo id="imagenUrl" etiqueta="Imagen (opcional)" type="url" className="sm:col-span-2" defaultValue={rifa?.imagenUrl ?? ""} />
      <div className="sm:col-span-2">
        <BotonEnviar className="fondo-oro" size="lg">
          {rifa ? "Guardar cambios" : "Crear rifa"}
        </BotonEnviar>
      </div>
    </FormAccion>
  );
}
