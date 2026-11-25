"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ingresar, registrarse } from "@/app/acciones/auth";
import { MensajeFormulario } from "@/components/formulario-accion";

function Campo({ id, etiqueta, ...props }: { id: string; etiqueta: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input id={id} name={id} className="h-10" {...props} />
    </div>
  );
}

export function FormularioIngreso({ siguiente }: { siguiente?: string }) {
  const [estado, enviar, pendiente] = useActionState(ingresar, null);
  return (
    <form action={enviar} className="flex flex-col gap-4">
      {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}
      <Campo id="email" etiqueta="Correo" type="email" autoComplete="email" required />
      <Campo id="clave" etiqueta="Contraseña" type="password" autoComplete="current-password" required />
      <MensajeFormulario estado={estado} />
      <Button type="submit" size="lg" className="fondo-oro h-11" disabled={pendiente}>
        {pendiente ? "Ingresando..." : "Iniciar sesión"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href={`/registro${siguiente ? `?siguiente=${encodeURIComponent(siguiente)}` : ""}`} className="text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  );
}

export function FormularioRegistro({
  siguiente,
  inicial,
}: {
  siguiente?: string;
  inicial: { nombre?: string; email?: string; telefono?: string };
}) {
  const [estado, enviar, pendiente] = useActionState(registrarse, null);
  return (
    <form action={enviar} className="grid gap-4 sm:grid-cols-2">
      {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}
      <div className="sm:col-span-2">
        <Campo id="nombre" etiqueta="Nombre completo" autoComplete="name" defaultValue={inicial.nombre} required minLength={3} />
      </div>
      <Campo id="email" etiqueta="Correo" type="email" autoComplete="email" defaultValue={inicial.email} required />
      <Campo id="telefono" etiqueta="Celular (WhatsApp)" type="tel" autoComplete="tel" defaultValue={inicial.telefono} required />
      <div className="sm:col-span-2">
        <Campo id="documento" etiqueta="Cédula (para entregar premios)" inputMode="numeric" />
      </div>
      <Campo id="clave" etiqueta="Contraseña" type="password" autoComplete="new-password" minLength={8} required />
      <Campo id="confirmacion" etiqueta="Confirma la contraseña" type="password" autoComplete="new-password" minLength={8} required />
      <label className="flex items-start gap-2 text-sm text-muted-foreground sm:col-span-2">
        <input type="checkbox" name="terminos" required className="mt-1 accent-[var(--oro)]" />
        <span>
          Soy mayor de edad y acepto los{" "}
          <Link href="/terminos" target="_blank" className="text-primary hover:underline">
            términos y condiciones
          </Link>
          .
        </span>
      </label>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <MensajeFormulario estado={estado} />
        <Button type="submit" size="lg" className="fondo-oro h-11" disabled={pendiente}>
          {pendiente ? "Creando tu cuenta..." : "Crear mi cuenta"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href={`/ingresar${siguiente ? `?siguiente=${encodeURIComponent(siguiente)}` : ""}`} className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </form>
  );
}
