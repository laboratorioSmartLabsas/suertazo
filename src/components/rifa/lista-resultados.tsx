import { Trophy } from "lucide-react";
import { formatoFechaCorta } from "@/lib/fechas";
import { formatoBoleta, formatoPesos, nombrePublico } from "@/lib/formato";
import type { ultimosResultados } from "@/lib/consultas";

type Fila = Awaited<ReturnType<typeof ultimosResultados>>[number];

export function ListaResultados({ resultados, vacio }: { resultados: Fila[]; vacio: string }) {
  if (!resultados.length) {
    return <p className="rounded-xl border border-dashed borde-oro p-6 text-center text-sm text-muted-foreground">{vacio}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {resultados.map((r) => (
        <li key={r.id} className="flex items-center gap-4 rounded-xl border borde-oro bg-card/70 p-3 sm:p-4">
          <div className="fondo-oro flex h-14 w-20 shrink-0 items-center justify-center rounded-lg font-heading text-xl font-bold tracking-widest">
            {r.numeroGanador !== null ? formatoBoleta(r.numeroGanador, r.cifras) : "—"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">{r.titulo}</span>
            <span className="truncate text-xs text-muted-foreground">
              {formatoFechaCorta(r.fecha)} · {r.loteria ?? "Lotería por confirmar"} · {r.rifaNombre}
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-end text-right">
            {r.ganadorNombre ? (
              <span className="flex items-center gap-1 text-sm font-semibold text-emerald-300">
                <Trophy className="size-4" /> {nombrePublico(r.ganadorNombre)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">{r.boletaSinCuota ? "Boleta sin cuota" : "No vendido"}</span>
            )}
            {r.valorPremio > 0 && <span className="text-xs text-muted-foreground">{formatoPesos(r.valorPremio)}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
