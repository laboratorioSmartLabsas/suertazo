import Image from "next/image";
import Link from "next/link";
import { BadgePercent, CalendarCheck, CreditCard, Megaphone, ShieldCheck, Ticket, UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TarjetaRifa } from "@/components/rifa/tarjeta-rifa";
import { ListaResultados } from "@/components/rifa/lista-resultados";
import { rifasPublicas, ultimosResultados } from "@/lib/consultas";
import { obtenerAjustes } from "@/lib/rifas";
import { cn } from "@/lib/utils";

const PASOS = [
  { icono: Ticket, titulo: "Elige tus números", texto: "Escoge tus boletas de 4 cifras o deja que la suerte elija por ti." },
  { icono: CreditCard, titulo: "Paga con el link", texto: "Pagas de contado o la cuota del mes en el link de pago seguro." },
  { icono: UserPlus, titulo: "Asienta tu compra", texto: "Crea tu cuenta con el mismo correo. El máster verifica el pago en el banco y aprueba tus boletas." },
  { icono: CalendarCheck, titulo: "Juega todos los días", texto: "Tu boleta juega cada sorteo con la lotería del día. Te avisamos de cada resultado." },
];

export default async function Inicio() {
  const [config, rifas, resultados] = await Promise.all([obtenerAjustes(), rifasPublicas(), ultimosResultados(5)]);
  const niveles = config.nivelesComision;

  return (
    <main>
      {config.anuncio && (
        <div className="border-b borde-oro bg-emerald-950/60">
          <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 text-sm">
            <Megaphone className="size-4 shrink-0 text-primary" />
            {config.anuncio}
          </p>
        </div>
      )}

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20">
        <div className="flex flex-col gap-6">
          <span className="w-fit rounded-full border borde-oro px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Rifas que pagan todos los días
          </span>
          <h1 className="font-heading text-4xl leading-tight font-bold tracking-wide sm:text-5xl">
            <span className="texto-oro">{config.inicioTitulo}</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">{config.inicioTexto}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="#rifas" className={cn(buttonVariants({ size: "lg" }), "fondo-oro h-12 px-6 text-base")}>
              Comprar mi boleta
            </Link>
            <Link href="/premios" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-6 text-base")}>
              Ver últimos premios
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-400" />
            Cada pago es verificado en el banco antes de aprobar tus boletas.
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute inset-6 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
          <Image src="/logo-suertazo.webp" alt="Logo de Suertazo" width={512} height={512} priority className="relative w-full" />
        </div>
      </section>

      <section id="rifas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-bold tracking-wide">Rifas disponibles</h2>
          <p className="text-muted-foreground">Elige la rifa en la que quieres jugar.</p>
        </div>
        {rifas.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rifas.map((r) => (
              <TarjetaRifa key={r.id} rifa={r} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed borde-oro p-10 text-center text-muted-foreground">
            En este momento no hay rifas habilitadas. Vuelve pronto: muy pronto abrimos una nueva.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-wide">Últimos premios</h2>
            <p className="text-muted-foreground">Resultados publicados por el máster de cada sorteo.</p>
          </div>
          <Link href="/premios" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver todos
          </Link>
        </div>
        <ListaResultados resultados={resultados} vacio="Los resultados aparecerán aquí cuando empiecen los sorteos." />
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
        <h2 className="mb-6 font-heading text-2xl font-bold tracking-wide">Cómo funciona</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="flex flex-col gap-3 rounded-2xl border borde-oro bg-card/70 p-5">
              <div className="flex items-center gap-3">
                <span className="fondo-oro flex size-9 items-center justify-center rounded-full font-heading font-bold">{i + 1}</span>
                <p.icono className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold">{p.titulo}</h3>
              <p className="text-sm text-muted-foreground">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="referidos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
        <div className="grid gap-6 rounded-3xl border borde-oro bg-gradient-to-br from-emerald-950/80 to-black p-6 sm:p-10 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <BadgePercent className="size-10 text-primary" />
            <h2 className="font-heading text-2xl font-bold tracking-wide">Comparte tu link y gana comisiones</h2>
            <p className="text-muted-foreground">
              Cada usuario tiene su link de referido. Por cada pago aprobado de las personas de tu red, el {config.comisionPorcentaje}% del valor
              se reparte en {niveles.length} líneas y llega directo a tu billetera.
            </p>
            <Link href="/registro" className={cn(buttonVariants({ size: "lg" }), "fondo-oro w-fit")}>
              Crear mi cuenta y mi link
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {niveles.map((n, i) => (
              <li key={i} className="flex flex-col items-center justify-center rounded-2xl border borde-oro bg-black/40 p-4 text-center">
                <span className="text-xs text-muted-foreground">Línea {i + 1}</span>
                <span className="texto-oro font-heading text-2xl font-bold">{n}%</span>
                <span className="text-xs text-muted-foreground">de la comisión</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
