import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Gift, Megaphone, ShoppingBag, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ActivarPush } from "@/components/activar-push";
import { MarcarVistas } from "@/components/marcar-vistas";
import { requerirUsuario } from "@/lib/auth";
import { notificacionesDe } from "@/lib/consultas";
import { formatoFechaHora } from "@/lib/fechas";

export const metadata: Metadata = { title: "Notificaciones" };

const ICONOS: Record<string, typeof Bell> = {
  resultado: Gift,
  sistema: Megaphone,
  compra: ShoppingBag,
  comision: Wallet,
  retiro: Wallet,
  admin: Bell,
};

export default async function Notificaciones() {
  const usuario = await requerirUsuario("/cuenta/notificaciones");
  const lista = await notificacionesDe(usuario.id, 80);
  const vistas = usuario.notificacionesVistasEn ?? usuario.creadoEn;

  return (
    <div className="flex flex-col gap-4">
      <MarcarVistas />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Resultados de sorteos, aprobaciones de pago y comisiones.</p>
        <ActivarPush clavePublica={process.env.VAPID_PUBLIC_KEY ?? null} />
      </div>
      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No tienes notificaciones todavía.</CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((n) => {
            const Icono = ICONOS[n.tipo] ?? Bell;
            const nueva = n.creadoEn > vistas;
            const contenido = (
              <div className={`flex gap-3 rounded-xl border p-4 ${nueva ? "border-primary/50 bg-primary/5" : "bg-card/60"}`}>
                <Icono className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {n.titulo}
                    {nueva && <span className="ml-2 text-xs font-normal text-primary">Nueva</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{n.mensaje}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatoFechaHora(n.creadoEn)}
                    {n.usuarioId === null ? " · Aviso general" : ""}
                  </p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.enlace?.startsWith("/") ? <Link href={n.enlace}>{contenido}</Link> : contenido}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
