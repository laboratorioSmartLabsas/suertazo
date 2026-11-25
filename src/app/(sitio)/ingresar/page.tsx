import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularioIngreso } from "@/components/auth/formularios";
import { obtenerUsuario } from "@/lib/auth";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function PaginaIngreso({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  const { siguiente } = await searchParams;
  const usuario = await obtenerUsuario();
  if (usuario) redirect(usuario.rol === "admin" ? "/admin" : "/cuenta");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <Card className="borde-oro border">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-wide">Iniciar sesión</CardTitle>
          <CardDescription>Consulta tus boletas, tu billetera y tu red de referidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioIngreso siguiente={siguiente} />
        </CardContent>
      </Card>
    </main>
  );
}
