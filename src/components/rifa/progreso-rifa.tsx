import { formatoNumero, porcentaje } from "@/lib/formato";

export function ProgresoRifa({
  vendidas,
  total,
  meta,
  porcentajeMeta,
  compacto = false,
}: {
  vendidas: number;
  total: number;
  meta: number;
  porcentajeMeta: number;
  compacto?: boolean;
}) {
  const avance = porcentaje(vendidas, total);
  const avanceMeta = porcentaje(vendidas, meta);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {formatoNumero(vendidas)} de {formatoNumero(total)} boletas vendidas
        </span>
        <span className="font-semibold tabular-nums text-primary">{avance}%</span>
      </div>
      <div
        className="relative h-3 w-full overflow-visible rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={avance}
        aria-label="Boletas vendidas"
      >
        <div className="fondo-oro h-full rounded-full transition-all" style={{ width: `${Math.max(avance, 1)}%` }} />
        <div
          className="absolute -top-1 h-5 w-0.5 rounded bg-emerald-400"
          style={{ left: `${porcentajeMeta}%` }}
          aria-hidden="true"
        />
      </div>
      {!compacto && (
        <p className="text-xs text-muted-foreground">
          {avanceMeta >= 100
            ? `Meta de preventa del ${porcentajeMeta}% alcanzada.`
            : `Faltan ${formatoNumero(Math.max(meta - vendidas, 0))} boletas para llegar al ${porcentajeMeta}% y fijar la fecha de inicio (${avanceMeta}% de la meta).`}
        </p>
      )}
    </div>
  );
}
