import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Gift, Info, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsigniaFase } from "@/components/rifa/insignia-fase";
import { ListaResultados } from "@/components/rifa/lista-resultados";
import { ProgresoRifa } from "@/components/rifa/progreso-rifa";
import { SelectorBoletas } from "@/components/rifa/selector-boletas";
import { obtenerUsuario } from "@/lib/auth";
import { proximosSorteos, rifaPorSlug, ultimosResultados } from "@/lib/consultas";
import { cuotasParaCompletar, mesVigente } from "@/lib/cuotas";
import { formatoFecha, formatoFechaCorta, hoyColombia, sumarMeses } from "@/lib/fechas";
import { formatoPesos } from "@/lib/formato";
import { MAX_BOLETAS_POR_ORDEN, obtenerAjustes, ventaAbierta } from "@/lib/rifas";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const rifa = await rifaPorSlug(slug);
  return rifa ? { title: rifa.nombre, description: rifa.descripcion.slice(0, 160) } : { title: "Rifa no encontrada" };
}

export default async function PaginaRifa({ params }: Props) {
  const { slug } = await params;
  const rifa = await rifaPorSlug(slug);
  if (!rifa) notFound();
  const [usuario, config, proximos, resultados] = await Promise.all([
    obtenerUsuario(),
    obtenerAjustes(),
    proximosSorteos(rifa.id, 6),
    ultimosResultados(6, rifa.id),
  ]);
  const cuotas = cuotasParaCompletar(rifa.precioBoleta, rifa.valorCuota);
  const fechaEstimada = sumarMeses(hoyColombia(), rifa.mesesEspera);

  const etapas = [
    {
      titulo: "Preventa",
      texto: `Se fija la fecha de inicio al vender el ${rifa.porcentajePreventa}% de la boletería.`,
      lista: rifa.fase !== "preventa",
    },
    {
      titulo: "Cuenta regresiva",
      texto: rifa.fechaInicioSorteos
        ? `Los sorteos inician el ${formatoFecha(rifa.fechaInicioSorteos)}.`
        : `${rifa.mesesEspera} ${rifa.mesesEspera === 1 ? "mes" : "meses"} después de alcanzar la meta (si fuera hoy: ${formatoFechaCorta(fechaEstimada)}).`,
      lista: rifa.fase === "en_juego" || rifa.fase === "finalizada",
    },
    {
      titulo: "Sorteos diarios",
      texto: `${rifa.diasSorteo} sorteos con el resultado de la lotería de cada día.`,
      lista: rifa.fase === "finalizada",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:py-12">
      <section className="flex flex-col gap-4">
        <InsigniaFase fase={rifa.fase} className="w-fit" />
        <h1 className="font-heading text-3xl font-bold tracking-wide sm:text-4xl">
          <span className="texto-oro">{rifa.nombre}</span>
        </h1>
        <p className="max-w-3xl text-muted-foreground">{rifa.descripcion}</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <Card className="borde-oro border">
            <CardHeader>
              <CardTitle>Avance de la boletería</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <ProgresoRifa vendidas={rifa.vendidas} total={rifa.total} meta={rifa.meta} porcentajeMeta={rifa.porcentajePreventa} />
              <ol className="flex flex-col gap-3">
                {etapas.map((e) => (
                  <li key={e.titulo} className="flex gap-3">
                    <CheckCircle2 className={e.lista ? "mt-0.5 size-5 text-emerald-400" : "mt-0.5 size-5 text-muted-foreground/50"} />
                    <div>
                      <p className="font-medium">{e.titulo}</p>
                      <p className="text-sm text-muted-foreground">{e.texto}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="borde-oro border">
            <CardHeader>
              <CardTitle>Premios</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {rifa.premios.map((p) => (
                  <li key={p.id} className="flex gap-3 rounded-xl bg-black/30 p-3">
                    {p.tipo === "diario" ? (
                      <Trophy className="mt-0.5 size-5 shrink-0 text-primary" />
                    ) : (
                      <Gift className="mt-0.5 size-5 shrink-0 text-emerald-400" />
                    )}
                    <div>
                      <p className="font-semibold">{p.titulo}</p>
                      {p.descripcion && <p className="text-sm text-muted-foreground">{p.descripcion}</p>}
                      {p.tipo === "especial" && p.diaSorteo && (
                        <p className="text-xs text-primary">Se juega el día {p.diaSorteo} del calendario de sorteos.</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {rifa.valorCuota > 0 && (
            <Card className="border border-emerald-700/50 bg-emerald-950/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="size-5 text-emerald-400" /> Paga en cuotas de {formatoPesos(rifa.valorCuota)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>Cada cuota mensual habilita tu boleta para todos los sorteos de ese mes.</p>
                <p>Si un mes no pagas la cuota, tu boleta no juega los sorteos de ese mes, aunque su número salga.</p>
                <p>
                  Al completar {cuotas} cuotas ({formatoPesos(rifa.precioBoleta)}) tu boleta queda paga y juega todos los sorteos que quedan.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {ventaAbierta(rifa) ? (
            <SelectorBoletas
              rifa={{
                id: rifa.id,
                cifras: rifa.cifras,
                precioBoleta: rifa.precioBoleta,
                valorCuota: rifa.valorCuota,
                mesCuota: mesVigente(rifa),
              }}
              usuario={usuario ? { nombre: usuario.nombre, email: usuario.email } : null}
              nombrePasarela={config.nombrePasarela}
              maximo={MAX_BOLETAS_POR_ORDEN}
            />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">La venta de esta rifa está cerrada.</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5 text-primary" /> Próximos sorteos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proximos.length ? (
                <ul className="flex flex-col divide-y divide-border">
                  {proximos.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{s.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatoFecha(s.fecha)} · {s.loteria ?? "Lotería por definir"}
                        </p>
                      </div>
                      {s.valorPremio > 0 && <span className="font-semibold text-primary">{formatoPesos(s.valorPremio)}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  El calendario se publica cuando se alcanza el {rifa.porcentajePreventa}% de la boletería.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-bold tracking-wide">Resultados de esta rifa</h2>
        <ListaResultados resultados={resultados} vacio="Aún no hay resultados publicados para esta rifa." />
      </section>
    </main>
  );
}
