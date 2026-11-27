import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotonEnviar, FormAccion } from "@/components/formulario-accion";
import { actualizarPerfil, cambiarClave } from "@/app/acciones/cuenta";
import { requerirUsuario } from "@/lib/auth";

export const metadata: Metadata = { title: "Perfil" };

export default async function Perfil() {
  const usuario = await requerirUsuario("/cuenta/perfil");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="borde-oro border">
        <CardHeader>
          <CardTitle>Mis datos</CardTitle>
          <CardDescription>Los usamos para contactarte y entregarte tus premios.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormAccion accion={actualizarPerfil} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" name="nombre" defaultValue={usuario.nombre} required minLength={3} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" value={usuario.email} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telefono">Celular (WhatsApp)</Label>
              <Input id="telefono" name="telefono" type="tel" defaultValue={usuario.telefono} required />
            </div>
            <BotonEnviar className="fondo-oro w-fit">Guardar cambios</BotonEnviar>
          </FormAccion>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <FormAccion accion={cambiarClave} reiniciar className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actual">Contraseña actual</Label>
              <Input id="actual" name="actual" type="password" autoComplete="current-password" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nueva">Nueva contraseña</Label>
              <Input id="nueva" name="nueva" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <BotonEnviar variant="outline" className="w-fit">Actualizar contraseña</BotonEnviar>
          </FormAccion>
        </CardContent>
      </Card>
    </div>
  );
}
