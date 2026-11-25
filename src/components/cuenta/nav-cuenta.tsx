"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ENLACES = [
  { href: "/cuenta", etiqueta: "Inicio" },
  { href: "/cuenta/billetera", etiqueta: "Billetera" },
  { href: "/cuenta/referidos", etiqueta: "Referidos" },
  { href: "/cuenta/notificaciones", etiqueta: "Notificaciones" },
  { href: "/cuenta/perfil", etiqueta: "Perfil" },
];

export function NavCuenta({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname();
  const enlaces = esAdmin ? [...ENLACES, { href: "/admin", etiqueta: "Panel del máster" }] : ENLACES;
  return (
    <nav className="-mx-4 overflow-x-auto px-4" aria-label="Mi cuenta">
      <ul className="flex w-max gap-1 rounded-xl border borde-oro bg-card/60 p-1">
        {enlaces.map((e) => {
          const activo = e.href === "/cuenta" ? ruta === "/cuenta" : ruta.startsWith(e.href);
          return (
            <li key={e.href}>
              <Link
                href={e.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  activo ? "fondo-oro font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {e.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
