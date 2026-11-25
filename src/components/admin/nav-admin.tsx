"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Gift, LayoutDashboard, Settings, ShoppingCart, Ticket, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ENLACES = [
  { href: "/admin", etiqueta: "Resumen", icono: LayoutDashboard },
  { href: "/admin/ventas", etiqueta: "Ventas y pagos", icono: ShoppingCart },
  { href: "/admin/rifas", etiqueta: "Rifas y sorteos", icono: Ticket },
  { href: "/admin/premios", etiqueta: "Premiaciones", icono: Trophy },
  { href: "/admin/comisiones", etiqueta: "Comisiones", icono: Coins },
  { href: "/admin/usuarios", etiqueta: "Usuarios", icono: Users },
  { href: "/admin/loterias", etiqueta: "Loterías", icono: Gift },
  { href: "/admin/ajustes", etiqueta: "Ajustes", icono: Settings },
];

export function NavAdmin({ pendientes }: { pendientes: number }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Administración" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex w-max gap-1 lg:w-auto lg:flex-col">
        {ENLACES.map((e) => {
          const activo = e.href === "/admin" ? ruta === "/admin" : ruta.startsWith(e.href);
          return (
            <li key={e.href}>
              <Link
                href={e.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  activo ? "fondo-oro font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <e.icono className="size-4" />
                {e.etiqueta}
                {e.href === "/admin/ventas" && pendientes > 0 && (
                  <span className={cn("ml-auto rounded-full px-1.5 text-xs font-bold", activo ? "bg-black/20" : "bg-primary text-primary-foreground")}>
                    {pendientes}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
