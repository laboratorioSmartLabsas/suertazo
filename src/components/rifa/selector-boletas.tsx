"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Dices, Plus, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { consultarNumeros, crearOrden, numerosAlAzar } from "@/app/acciones/compras";
import { MensajeFormulario } from "@/components/formulario-accion";
import { formatoBoleta, formatoPesos } from "@/lib/formato";
import { cn } from "@/lib/utils";

type Props = {
  rifa: { id: number; cifras: number; precioBoleta: number; valorCuota: number; mesCuota: number };
  usuario: { nombre: string; email: string } | null;
  nombrePasarela: string;
  maximo: number;
};

export function SelectorBoletas({ rifa, usuario, nombrePasarela, maximo }: Props) {
  const [numeros, setNumeros] = useState<number[]>([]);
  const [entrada, setEntrada] = useState("");
  const [plan, setPlan] = useState<"contado" | "cuotas">(rifa.valorCuota > 0 ? "cuotas" : "contado");
  const [buscando, iniciar] = useTransition();
  const [estado, enviar, enviando] = useActionState(crearOrden, null);

  useEffect(() => {
    if (estado?.error) toast.error(estado.error);
  }, [estado]);

  const valorUnitario = plan === "cuotas" ? rifa.valorCuota : rifa.precioBoleta;
  const total = numeros.length * valorUnitario;

  function agregar(lista: number[]) {
    setNumeros((previo) => [...previo, ...lista.filter((n) => !previo.includes(n))].slice(0, maximo));
  }

  function agregarEscrito() {
    const limpio = entrada.trim();
    if (!/^\d+$/.test(limpio) || limpio.length > rifa.cifras) {
      toast.error(`Escribe un número de hasta ${rifa.cifras} cifras.`);
      return;
    }
    const numero = Number(limpio);
    if (numeros.includes(numero)) {
      toast.info("Ese número ya está en tu selección.");
      return;
    }
    if (numeros.length >= maximo) {
      toast.error(`Puedes elegir hasta ${maximo} boletas por compra.`);
      return;
    }
    iniciar(async () => {
      const r = await consultarNumeros(rifa.id, [numero]);
      if ("error" in r) return void toast.error(r.error);
      if (r.disponibles.includes(numero)) {
        agregar([numero]);
        setEntrada("");
      } else {
        toast.error(`El ${formatoBoleta(numero, rifa.cifras)} ya tiene dueño o está reservado. Prueba otro.`);
      }
    });
  }

  function agregarAlAzar(cantidad: number) {
    const espacio = maximo - numeros.length;
    if (espacio <= 0) return void toast.error(`Puedes elegir hasta ${maximo} boletas por compra.`);
    iniciar(async () => {
      const r = await numerosAlAzar(rifa.id, Math.min(cantidad, espacio), numeros);
      if ("error" in r) return void toast.error(r.error);
      agregar(r.numeros);
    });
  }

  return (
    <Card className="borde-oro border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ticket className="size-5 text-primary" /> Elige tus números
        </CardTitle>
        <CardDescription>Escribe el número que quieres o deja que la suerte elija por ti.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            placeholder={"0".repeat(rifa.cifras)}
            maxLength={rifa.cifras}
            value={entrada}
            onChange={(e) => setEntrada(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarEscrito();
              }
            }}
            className="h-11 text-center font-heading text-xl tracking-[0.3em]"
            aria-label="Número de boleta"
          />
          <Button type="button" size="lg" variant="outline" className="h-11" onClick={agregarEscrito} disabled={buscando}>
            <Plus data-icon="inline-start" /> Agregar
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Al azar:</span>
          {[1, 2, 5, 10].map((n) => (
            <Button key={n} type="button" size="sm" variant="secondary" onClick={() => agregarAlAzar(n)} disabled={buscando}>
              <Dices data-icon="inline-start" /> {n}
            </Button>
          ))}
        </div>

        <div className="min-h-14 rounded-xl border border-dashed borde-oro bg-black/20 p-3">
          {numeros.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              {buscando ? "Buscando números disponibles..." : "Aún no has elegido números."}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label="Números seleccionados">
              {numeros.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => setNumeros((p) => p.filter((x) => x !== n))}
                    className="fondo-oro flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-heading text-sm font-bold tracking-widest"
                    aria-label={`Quitar ${formatoBoleta(n, rifa.cifras)}`}
                  >
                    {formatoBoleta(n, rifa.cifras)}
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {rifa.valorCuota > 0 && (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-medium">¿Cómo quieres pagar?</legend>
            {(
              [
                {
                  id: "cuotas",
                  titulo: `Cuota de ${formatoPesos(rifa.valorCuota)} al mes`,
                  texto: `Pagas hoy la cuota del mes ${rifa.mesCuota}. Cada cuota habilita tu boleta los sorteos de ese mes; al completar ${formatoPesos(rifa.precioBoleta)} queda paga.`,
                },
                {
                  id: "contado",
                  titulo: `De contado: ${formatoPesos(rifa.precioBoleta)}`,
                  texto: "Tu boleta queda paga y juega todos los sorteos del año sin preocuparte por cuotas.",
                },
              ] as const
            ).map((op) => (
              <label
                key={op.id}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors",
                  plan === op.id ? "border-primary bg-primary/10" : "hover:bg-muted/50",
                )}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <input
                    type="radio"
                    name="plan-visual"
                    value={op.id}
                    checked={plan === op.id}
                    onChange={() => setPlan(op.id)}
                    className="accent-[var(--oro)]"
                  />
                  {op.titulo}
                </span>
                <span className="text-xs text-muted-foreground">{op.texto}</span>
              </label>
            ))}
          </fieldset>
        )}

        <form action={enviar} className="flex flex-col gap-4">
          <input type="hidden" name="rifaId" value={rifa.id} />
          <input type="hidden" name="numeros" value={JSON.stringify(numeros)} />
          <input type="hidden" name="plan" value={plan} />

          {usuario ? (
            <p className="rounded-lg bg-muted/50 p-3 text-sm">
              Comprando como <strong>{usuario.nombre}</strong> ({usuario.email}).
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Compra sin cuenta: después del pago crea tu cuenta con este mismo correo para asentar tus boletas.{" "}
                <Link href="/ingresar" className="text-primary underline-offset-4 hover:underline">
                  ¿Ya tienes cuenta?
                </Link>
              </p>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" name="nombre" autoComplete="name" required minLength={3} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefono">Celular (WhatsApp)</Label>
                <Input id="telefono" name="telefono" type="tel" autoComplete="tel" required />
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="terminos" required className="mt-1 accent-[var(--oro)]" />
            <span>
              Soy mayor de edad y acepto los{" "}
              <Link href="/terminos" target="_blank" className="text-primary underline-offset-4 hover:underline">
                términos y condiciones
              </Link>
              .
            </span>
          </label>

          <div className="flex flex-col gap-3 rounded-xl border borde-oro bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {numeros.length} {numeros.length === 1 ? "boleta" : "boletas"} × {formatoPesos(valorUnitario)}
                {plan === "cuotas" ? " (primera cuota)" : ""}
              </p>
              <p className="texto-oro text-3xl font-bold">{formatoPesos(total)}</p>
            </div>
            <Button type="submit" size="lg" className="fondo-oro h-12 px-6 text-base" disabled={!numeros.length || enviando}>
              {enviando ? "Creando solicitud..." : `Continuar al pago con ${nombrePasarela}`}
            </Button>
          </div>
          <MensajeFormulario estado={estado} />
        </form>
      </CardContent>
    </Card>
  );
}
