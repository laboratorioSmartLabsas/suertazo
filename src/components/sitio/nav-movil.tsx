"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Marca } from "@/components/marca";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ENLACES = [
  { href: "/#rifas", etiqueta: "Rifas disponibles" },
  { href: "/premios", etiqueta: "Últimos premios" },
  { href: "/#como-funciona", etiqueta: "Cómo funciona" },
  { href: "/#referidos", etiqueta: "Gana comisiones" },
];

export function NavMovil({ conSesion }: { conSesion: boolean }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle render={<div />}>
            <Marca tamaño={32} />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4" aria-label="Menú móvil">
          {ENLACES.map((e) => (
            <SheetClose key={e.href} render={<Link href={e.href} />} className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}>
              {e.etiqueta}
            </SheetClose>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t borde-oro pt-4">
            {conSesion ? (
              <SheetClose render={<Link href="/cuenta" />} className={cn(buttonVariants(), "fondo-oro")}>
                Mi cuenta
              </SheetClose>
            ) : (
              <>
                <SheetClose render={<Link href="/registro" />} className={cn(buttonVariants(), "fondo-oro")}>
                  Registrarse
                </SheetClose>
                <SheetClose render={<Link href="/ingresar" />} className={buttonVariants({ variant: "outline" })}>
                  Iniciar sesión
                </SheetClose>
              </>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
