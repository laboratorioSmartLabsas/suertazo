import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { ActivarPush } from "@/components/activar-push";
import { MarcarVistas } from "@/components/marcar-vistas";
import { ListaResultados } from "@/components/rifa/lista-resultados";
import { avisosPublicos, ultimosResultados } from "@/lib/consultas";
import { formatoFechaHora } from "@/lib/fechas";

export const metadata: Metadata = { title: "Últimos premios" };

export default async function PaginaPremios() {
  const [resultados, avisos] = await Promise.all([ultimosResultados(60), avisosPublicos(10)]);
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <MarcarVistas />
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-wide">
          <span className="texto-oro">Últimos premios</span>
        </h1>
        <p className="text-muted-foreground">
          Estos son los números ganadores publicados por el máster con el resultado de cada lotería, y quién ganó en cada sorteo.
        </p>
        <div>
          <ActivarPush clavePublica={process.env.VAPID_PUBLIC_KEY ?? null} />
        </div>
      </header>

      {avisos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Bell className="size-4 text-primary" /> Avisos
          </h2>
          <ul className="flex flex-col gap-2">
            {avisos.map((a) => (
              <li key={a.id} className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4">
                <p className="font-medium">{a.titulo}</p>
                <p className="text-sm text-muted-foreground">{a.mensaje}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatoFechaHora(a.creadoEn)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Resultados</h2>
        <ListaResultados
          resultados={resultados}
          vacio="Todavía no hay sorteos jugados. Cuando el máster publique el primer resultado lo verás aquí y te llegará una notificación."
        />
      </section>
    </main>
  );
}
