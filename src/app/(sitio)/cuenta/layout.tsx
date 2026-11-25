import type { ReactNode } from "react";
import { NavCuenta } from "@/components/cuenta/nav-cuenta";
import { requerirUsuario } from "@/lib/auth";

export default async function LayoutCuenta({ children }: { children: ReactNode }) {
  const usuario = await requerirUsuario();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Mi cuenta</p>
        <h1 className="font-heading text-2xl font-bold tracking-wide sm:text-3xl">
          Hola, <span className="texto-oro">{usuario.nombre.split(" ")[0]}</span>
        </h1>
      </header>
      <NavCuenta esAdmin={usuario.rol === "admin"} />
      {children}
    </main>
  );
}
