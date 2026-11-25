import type { ReactNode } from "react";

export function TituloAdmin({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-wide">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones}
    </header>
  );
}

export function Kpi({ titulo, valor, detalle }: { titulo: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="rounded-2xl border borde-oro bg-card/70 p-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-bold">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}
