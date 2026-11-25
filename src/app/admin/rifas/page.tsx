import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TituloAdmin } from "@/components/admin/titulo";
import { InsigniaFase } from "@/components/rifa/insignia-fase";
import { ProgresoRifa } from "@/components/rifa/progreso-rifa";
import { todasLasRifas } from "@/lib/consultas";
import { formatoPesos } from "@/lib/formato";

export const metadata: Metadata = { title: "Rifas" };

export default async function RifasAdmin() {
  const lista = await todasLasRifas();
  return (
    <>
      <TituloAdmin
        titulo="Rifas y sorteos"
        descripcion="Crea rifas, define premios, cuotas y el calendario de sorteos."
        acciones={
          <Link href="/admin/rifas/nueva" className={buttonVariants({ className: "fondo-oro" })}>
            <Plus data-icon="inline-start" /> Nueva rifa
          </Link>
        }
      />
      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Aún no hay rifas. Crea la primera.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {lista.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{r.nombre}</CardTitle>
                  <InsigniaFase fase={r.fase} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatoPesos(r.precioBoleta)} de contado{r.valorCuota ? ` · cuotas de ${formatoPesos(r.valorCuota)}` : ""} · {r.premios.length} premios
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ProgresoRifa vendidas={r.vendidas} total={r.total} meta={r.meta} porcentajeMeta={r.porcentajePreventa} compacto />
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/rifas/${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Editar y premios
                  </Link>
                  <Link href={`/admin/rifas/${r.id}/sorteos`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Sorteos y resultados
                  </Link>
                  {r.estado !== "borrador" && (
                    <Link href={`/rifas/${r.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Ver página pública
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
