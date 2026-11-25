"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { EstadoAccion } from "@/app/acciones/tipos";

type Accion = (previo: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;

export function FormAccion({
  accion,
  children,
  className,
  confirmar,
  reiniciar = false,
}: {
  accion: Accion;
  children: ReactNode;
  className?: string;
  confirmar?: string;
  reiniciar?: boolean;
}) {
  const [estado, ejecutar, pendiente] = useActionState(accion, null);

  useEffect(() => {
    if (estado?.error) toast.error(estado.error);
    else if (estado?.mensaje) toast.success(estado.mensaje);
  }, [estado]);

  return (
    <form
      action={ejecutar}
      className={className}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
      onReset={reiniciar ? undefined : (e) => e.preventDefault()}
    >
      <fieldset disabled={pendiente} className="contents">
        {children}
      </fieldset>
    </form>
  );
}

export function BotonEnviar({
  children,
  pendienteTexto = "Guardando...",
  ...props
}: React.ComponentProps<typeof Button> & { pendienteTexto?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendienteTexto : children}
    </Button>
  );
}

export function MensajeFormulario({ estado }: { estado: EstadoAccion }) {
  if (!estado?.error && !estado?.mensaje) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={estado.error ? "text-sm text-destructive" : "text-sm text-emerald-400"}
    >
      {estado.error ?? estado.mensaje}
    </p>
  );
}
