import Link from "next/link";
import { Bell } from "lucide-react";
import { Marca } from "@/components/marca";
import { buttonVariants } from "@/components/ui/button";
import { obtenerUsuario } from "@/lib/auth";
import { contarNoLeidas } from "@/lib/consultas";
import { cn } from "@/lib/utils";
import { MenuUsuario } from "./menu-usuario";
import { NavMovil } from "./nav-movil";

export const ENLACES_SITIO = [
  { href: "/#rifas", etiqueta: "Rifas" },
  { href: "/premios", etiqueta: "Últimos premios" },
  { href: "/#como-funciona", etiqueta: "Cómo funciona" },
  { href: "/#referidos", etiqueta: "Gana comisiones" },
];

export async function Encabezado() {
  const usuario = await obtenerUsuario();
  const noLeidas = await contarNoLeidas(usuario);

  return (
    <header className="sticky top-0 z-40 border-b borde-oro bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Marca />
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Principal">
          {ENLACES_SITIO.map((e) => (
            <Link key={e.href} href={e.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {e.etiqueta}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            href={usuario ? "/cuenta/notificaciones" : "/premios"}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
            aria-label={noLeidas ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
          >
            <Bell />
            {noLeidas > 0 && (
              <span className="fondo-oro absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </Link>
          {usuario ? (
            <MenuUsuario nombre={usuario.nombre} esAdmin={usuario.rol === "admin"} />
          ) : (
            <>
              <Link href="/ingresar" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Iniciar sesión
              </Link>
              <Link href="/registro" className={cn(buttonVariants({ size: "sm" }), "fondo-oro hidden sm:inline-flex")}>
                Registrarse
              </Link>
            </>
          )}
          <NavMovil conSesion={Boolean(usuario)} />
        </div>
      </div>
    </header>
  );
}
