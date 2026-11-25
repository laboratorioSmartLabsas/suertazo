import Link from "next/link";
import { CalendarDays, Gift, Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { RifaConEstado } from "@/lib/consultas";
import { formatoFecha } from "@/lib/fechas";
import { formatoPesos } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { InsigniaFase } from "./insignia-fase";
import { ProgresoRifa } from "./progreso-rifa";

export function TarjetaRifa({ rifa }: { rifa: RifaConEstado }) {
  return (
    <Card className="borde-oro overflow-hidden border bg-gradient-to-b from-emerald-950/50 to-card">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <InsigniaFase fase={rifa.fase} />
          <span className="text-xs text-muted-foreground">Boleta de {rifa.cifras} cifras</span>
        </div>
        <CardTitle className="font-heading text-xl tracking-wide">{rifa.nombre}</CardTitle>
        <p className="line-clamp-3 text-sm text-muted-foreground">{rifa.descripcion}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border borde-oro bg-black/30 p-3">
            <span className="text-xs text-muted-foreground">De contado</span>
            <p className="texto-oro text-2xl font-bold">{formatoPesos(rifa.precioBoleta)}</p>
          </div>
          {rifa.valorCuota > 0 ? (
            <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-3">
              <span className="text-xs text-muted-foreground">O en cuotas de</span>
              <p className="text-2xl font-bold text-emerald-300">
                {formatoPesos(rifa.valorCuota)}
                <span className="text-sm font-normal text-muted-foreground">/mes</span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-black/30 p-3">
              <span className="text-xs text-muted-foreground">Sorteos</span>
              <p className="text-2xl font-bold">{rifa.diasSorteo}</p>
            </div>
          )}
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {rifa.premios.map((p) => (
            <li key={p.id} className="flex items-start gap-2">
              {p.tipo === "diario" ? (
                <Trophy className="mt-0.5 size-4 shrink-0 text-primary" />
              ) : (
                <Gift className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              )}
              <span>{p.titulo}</span>
            </li>
          ))}
        </ul>
        <ProgresoRifa
          vendidas={rifa.vendidas}
          total={rifa.total}
          meta={rifa.meta}
          porcentajeMeta={rifa.porcentajePreventa}
          compacto
        />
        {rifa.fechaInicioSorteos && (
          <p className="flex items-center gap-2 text-sm text-emerald-300">
            <CalendarDays className="size-4" />
            Sorteos desde el {formatoFecha(rifa.fechaInicioSorteos)}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Link href={`/rifas/${rifa.slug}`} className={cn(buttonVariants({ size: "lg" }), "fondo-oro w-full")}>
          Comprar boleta
        </Link>
      </CardFooter>
    </Card>
  );
}
