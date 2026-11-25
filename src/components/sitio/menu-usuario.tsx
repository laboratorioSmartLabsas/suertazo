"use client";

import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Ticket, User, Users, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { salir } from "@/app/acciones/auth";
import { iniciales } from "@/lib/formato";

export function MenuUsuario({ nombre, esAdmin }: { nombre: string; esAdmin: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border borde-oro py-1 pr-2 pl-1 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar size="sm">
          <AvatarFallback className="fondo-oro text-xs font-bold">{iniciales(nombre)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-28 truncate sm:inline">{nombre.split(" ")[0]}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{nombre}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {esAdmin && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <LayoutDashboard /> Panel del máster
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href="/cuenta" />}>
            <Ticket /> Mis boletas
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/cuenta/billetera" />}>
            <Wallet /> Billetera
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/cuenta/referidos" />}>
            <Users /> Referidos
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/cuenta/perfil" />}>
            <User /> Perfil
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => salir()}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
