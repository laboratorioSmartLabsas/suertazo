import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle2, Clock, ExternalLink, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotonCopiar } from "@/components/copiar";
import { db } from "@/db";
import { ordenes, rifas } from "@/db/schema";
import { leerTokensCompra, obtenerUsuario } from "@/lib/auth";
import { formatoFechaHora } from "@/lib/fechas";
import { formatoBoleta, formatoPesos } from "@/lib/formato";
import { obtenerAjustes } from "@/lib/rifas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tu solicitud de pago", robots: { index: false } };

type Props = { params: Promise<{ referencia: string }> };

const ESTADOS = {
  pendiente: { icono: Clock, titulo: "Pendiente de aprobación", clase: "text-primary" },
  aprobada: { icono: CheckCircle2, titulo: "Pago aprobado", clase: "text-emerald-400" },
  rechazada: { icono: XCircle, titulo: "Pago rechazado", clase: "text-destructive" },
  vencida: { icono: Clock, titulo: "Reserva vencida", clase: "text-muted-foreground" },
} as const;

export default async function PaginaCompra({ params }: Props) {
  const { referencia } = await params;
  const [fila] = await db
    .select({ orden: ordenes, rifa: rifas })
    .from(ordenes)
    .innerJoin(rifas, eq(rifas.id, ordenes.rifaId))
    .where(eq(ordenes.referencia, referencia.toUpperCase()))
    .limit(1);
  if (!fila) notFound();
  const { orden, rifa } = fila;

  const [usuario, tokens, config] = await Promise.all([obtenerUsuario(), leerTokensCompra(), obtenerAjustes()]);
  const autorizado =
    tokens.includes(orden.tokenReclamo) ||
    (usuario && (usuario.id === orden.usuarioId || usuario.rol === "admin"));
  if (!autorizado) notFound();

  const estado = ESTADOS[orden.estado];
  const esCuota = orden.tipo === "cuota";
  const pagaCuotas = esCuota || orden.plan === "cuotas";
  const linkPago = pagaCuotas ? rifa.linkPagoCuotas : rifa.linkPago;
  const unidades = esCuota ? (orden.detalle ?? []).length : orden.numeros.length;
  const valorUnidad = pagaCuotas ? rifa.valorCuota : rifa.precioBoleta;
  const parametrosRegistro = new URLSearchParams({
    email: orden.emailContacto,
    nombre: orden.nombreContacto,
    telefono: orden.telefonoContacto,
    siguiente: `/compra/${orden.referencia}`,
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className={cn("flex items-center gap-2 text-sm font-semibold", estado.clase)}>
          <estado.icono className="size-4" /> {estado.titulo}
        </p>
        <h1 className="font-heading text-2xl font-bold tracking-wide sm:text-3xl">
          {orden.estado === "pendiente" ? "Ya casi: realiza tu pago" : `Solicitud ${orden.referencia}`}
        </h1>
        <p className="text-muted-foreground">
          {esCuota ? "Pago de cuotas" : orden.plan === "cuotas" ? `Compra con primera cuota (mes ${orden.mes ?? 1})` : "Compra de contado"} ·{" "}
          {rifa.nombre}
        </p>
      </header>

      <Card className="borde-oro border">
        <CardHeader>
          <CardDescription>Referencia de pago</CardDescription>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="texto-oro font-heading text-3xl tracking-widest">{orden.referencia}</span>
            <BotonCopiar texto={orden.referencia} etiqueta="Copiar referencia" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {esCuota
              ? (orden.detalle ?? []).map((d) => (
                  <span key={`${d.boletaId}-${d.mes}`} className="rounded-lg border borde-oro px-3 py-1.5 text-sm">
                    <strong className="font-heading tracking-widest">{formatoBoleta(d.numero, rifa.cifras)}</strong> · mes {d.mes}
                  </span>
                ))
              : orden.numeros.map((n) => (
                  <span key={n} className="fondo-oro rounded-lg px-3 py-1.5 font-heading text-sm font-bold tracking-widest">
                    {formatoBoleta(n, rifa.cifras)}
                  </span>
                ))}
          </div>
          <div className="flex items-end justify-between gap-3 rounded-xl bg-black/30 p-4">
            <span className="text-sm text-muted-foreground">Total a pagar</span>
            <span className="texto-oro text-3xl font-bold">{formatoPesos(orden.total)}</span>
          </div>

          {orden.estado === "pendiente" && (
            <>
              {linkPago ? (
                <a
                  href={linkPago}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "lg" }), "fondo-oro h-12 text-base")}
                >
                  Pagar {formatoPesos(valorUnidad)} en {config.nombrePasarela}
                  <ExternalLink data-icon="inline-end" />
                </a>
              ) : (
                <Alert>
                  <AlertTitle>Link de pago en configuración</AlertTitle>
                  <AlertDescription>
                    El máster aún no publica el link de pago de esta rifa. Te contactaremos por WhatsApp al {orden.telefonoContacto}.
                  </AlertDescription>
                </Alert>
              )}
              {linkPago && unidades > 1 && (
                <Alert>
                  <AlertTitle>
                    Tu solicitud es de {unidades} × {formatoPesos(valorUnidad)}
                  </AlertTitle>
                  <AlertDescription>
                    Cada link de pago es de {formatoPesos(valorUnidad)}. Realiza {unidades} pagos (uno por cada {pagaCuotas ? "cuota" : "boleta"}) usando la misma referencia{" "}
                    {orden.referencia}.
                  </AlertDescription>
                </Alert>
              )}
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li>1. Paga exactamente {formatoPesos(orden.total)} y escribe la referencia {orden.referencia} en la descripción. Si el pago no te deja escribirla, envíanos el comprobante con la referencia.</li>
                <li>2. El máster verifica el pago en el banco y aprueba tu solicitud.</li>
                <li>3. Te llega una notificación y tus boletas quedan en tu perfil.</li>
              </ul>
              {config.instruccionesPago && <p className="text-sm text-muted-foreground">{config.instruccionesPago}</p>}
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-400" />
                Tus números quedan reservados hasta el {formatoFechaHora(orden.venceEn)}.
              </p>
            </>
          )}
          {orden.estado === "rechazada" && orden.notaAdmin && (
            <Alert variant="destructive">
              <AlertTitle>Motivo</AlertTitle>
              <AlertDescription>{orden.notaAdmin}</AlertDescription>
            </Alert>
          )}
          {orden.estado === "vencida" && (
            <p className="text-sm text-muted-foreground">
              La reserva venció sin aprobación. Si ya pagaste, escríbenos con tu comprobante y la referencia para recuperarla.
            </p>
          )}
        </CardContent>
      </Card>

      {!usuario && !orden.usuarioId ? (
        <Card className="border border-emerald-700/60 bg-emerald-950/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-emerald-400" /> Asienta tu compra en tu perfil
            </CardTitle>
            <CardDescription>
              Crea tu cuenta con el correo {orden.emailContacto} para que tus boletas queden a tu nombre y recibas los resultados.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href={`/registro?${parametrosRegistro}`} className={cn(buttonVariants({ size: "lg" }), "fondo-oro")}>
              Crear mi cuenta
            </Link>
            <Link
              href={`/ingresar?siguiente=${encodeURIComponent(`/compra/${orden.referencia}`)}`}
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Ya tengo cuenta
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Link href="/cuenta" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-fit")}>
          Ir a mis boletas
        </Link>
      )}
    </main>
  );
}
