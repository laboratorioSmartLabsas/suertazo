import type { EstadoMes } from "@/lib/cuotas";
import { cn } from "@/lib/utils";

const ESTILO: Record<EstadoMes, string> = {
  pagado: "fondo-oro",
  cubierto: "bg-emerald-600 text-white",
  en_revision: "border border-primary text-primary",
  sin_pagar: "bg-destructive/20 text-destructive line-through",
  por_pagar: "bg-muted text-muted-foreground",
};

const TITULO: Record<EstadoMes, string> = {
  pagado: "Cuota pagada",
  cubierto: "Cubierto: boleta paga",
  en_revision: "Pago en revisión",
  sin_pagar: "No pagado: no jugó",
  por_pagar: "Por pagar",
};

export function MesesBoleta({ meses, mesActual }: { meses: { mes: number; estado: EstadoMes }[]; mesActual: number }) {
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Estado de cuotas por mes">
      {meses.map((m) => (
        <li
          key={m.mes}
          title={`Mes ${m.mes}: ${TITULO[m.estado]}`}
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-[11px] font-bold",
            ESTILO[m.estado],
            m.mes === mesActual && "ring-2 ring-emerald-400 ring-offset-1 ring-offset-background",
          )}
        >
          {m.mes}
          <span className="sr-only">{TITULO[m.estado]}</span>
        </li>
      ))}
    </ul>
  );
}

export function LeyendaMeses() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {(Object.keys(TITULO) as EstadoMes[]).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded-sm", ESTILO[k])} /> {TITULO[k]}
        </span>
      ))}
    </div>
  );
}
