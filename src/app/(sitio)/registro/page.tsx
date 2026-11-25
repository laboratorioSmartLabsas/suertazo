import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularioRegistro } from "@/components/auth/formularios";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { COOKIE_REFERIDO, obtenerUsuario } from "@/lib/auth";
import { nombrePublico } from "@/lib/formato";

export const metadata: Metadata = { title: "Crear cuenta" };

type Busqueda = { siguiente?: string; email?: string; nombre?: string; telefono?: string };

export default async function PaginaRegistro({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const params = await searchParams;
  if (await obtenerUsuario()) redirect("/cuenta");
  const codigo = (await cookies()).get(COOKIE_REFERIDO)?.value;
  const [invitador] = codigo
    ? await db.select({ nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.codigoReferido, codigo)).limit(1)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12">
      <Card className="borde-oro border">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-wide">Crea tu cuenta</CardTitle>
          <CardDescription>Asienta tus compras, sigue tus sorteos y obtén tu link de referido.</CardDescription>
          {invitador && (
            <p className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-950/50 p-3 text-sm text-emerald-300">
              <Users className="size-4" /> Te invitó {nombrePublico(invitador.nombre)}.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <FormularioRegistro
            siguiente={params.siguiente}
            inicial={{ nombre: params.nombre, email: params.email, telefono: params.telefono }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
