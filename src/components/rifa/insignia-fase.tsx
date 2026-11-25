import { Badge } from "@/components/ui/badge";
import { ETIQUETA_FASE, type Fase } from "@/lib/rifas";
import { cn } from "@/lib/utils";

const ESTILO: Record<Fase, string> = {
  borrador: "bg-muted text-muted-foreground",
  preventa: "fondo-oro",
  cuenta_regresiva: "bg-emerald-600 text-white",
  en_juego: "bg-emerald-500 text-black",
  finalizada: "bg-muted text-muted-foreground",
};

export function InsigniaFase({ fase, className }: { fase: Fase; className?: string }) {
  return <Badge className={cn(ESTILO[fase], "border-transparent", className)}>{ETIQUETA_FASE[fase]}</Badge>;
}
