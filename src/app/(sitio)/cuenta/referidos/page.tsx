import type { Metadata } from "next";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BotonCopiar } from "@/components/copiar";
import { db } from "@/db";
import { ordenes, usuarios } from "@/db/schema";
import { requerirUsuario } from "@/lib/auth";
import { formatoFechaCorta } from "@/lib/fechas";
import { nombrePublico } from "@/lib/formato";
import { obtenerAjustes } from "@/lib/rifas";
import { urlPublica } from "@/lib/url";

export const metadata: Metadata = { title: "Referidos" };

export default async function Referidos() {
  const usuario = await requerirUsuario("/cuenta/referidos");
  const config = await obtenerAjustes();
  const base = await urlPublica();
  const link = `${base}/r/${usuario.codigoReferido}`;
  const mensaje = encodeURIComponent(`¡Juega conmigo en Suertazo! $1.000.000 diarios, un lote en Guatapé y una NMAX. Compra tu boleta aquí: ${link}`);

  const lineas: { id: number; nombre: string; creadoEn: Date }[][] = [];
  let actuales = [usuario.id];
  for (let i = 0; i < config.nivelesComision.length && actuales.length; i++) {
    const siguientes = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre, creadoEn: usuarios.creadoEn })
      .from(usuarios)
      .where(inArray(usuarios.referidoPorId, actuales))
      .orderBy(desc(usuarios.creadoEn));
    lineas.push(siguientes);
    actuales = siguientes.map((s) => s.id);
  }
  const compradoresSinCuenta = await db
    .select({ email: ordenes.emailContacto, nombre: ordenes.nombreContacto, creadoEn: ordenes.creadoEn })
    .from(ordenes)
    .where(and(eq(ordenes.referidorId, usuario.id), eq(ordenes.estado, "aprobada"), isNull(ordenes.usuarioId)))
    .orderBy(desc(ordenes.creadoEn));
  const vistosSinCuenta = new Set<string>();
  const sinCuenta = compradoresSinCuenta.filter((c) => {
    const clave = c.email.toLowerCase();
    if (vistosSinCuenta.has(clave)) return false;
    vistosSinCuenta.add(clave);
    return true;
  });
  const directos = [
    ...(lineas[0] ?? []).map((d) => ({ clave: `u${d.id}`, nombre: d.nombre, creadoEn: d.creadoEn, sinCuenta: false })),
    ...sinCuenta.map((c) => ({ clave: `o${c.email}`, nombre: c.nombre, creadoEn: c.creadoEn, sinCuenta: true })),
  ].sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());

  return (
    <div className="flex flex-col gap-6">
      <Card className="borde-oro border bg-gradient-to-br from-emerald-950/70 to-card">
        <CardHeader>
          <CardTitle>Tu link de referido</CardTitle>
          <CardDescription>
            Quien entre por tu link llega al inicio de Suertazo y queda en tu red al comprar o registrarse. Ganas comisión por cada pago aprobado de tu
            red hasta la línea {config.nivelesComision.length}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input readOnly value={link} className="h-10 font-mono" aria-label="Link de referido" />
          <div className="flex gap-2">
            <BotonCopiar texto={link} etiqueta="Copiar link" />
            <a
              href={`https://wa.me/?text=${mensaje}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ className: "fondo-oro" })}
            >
              <MessageCircle data-icon="inline-start" /> WhatsApp
            </a>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {config.nivelesComision.map((p, i) => (
          <div key={i} className="rounded-2xl border borde-oro bg-card/70 p-4 text-center">
            <p className="text-xs text-muted-foreground">Línea {i + 1} · {p}%</p>
            <p className="texto-oro mt-1 font-heading text-3xl font-bold">{(lineas[i]?.length ?? 0) + (i === 0 ? sinCuenta.length : 0)}</p>
            <p className="text-xs text-muted-foreground">personas</p>
          </div>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Tus referidos directos</CardTitle>
        </CardHeader>
        <CardContent>
          {directos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aún no tienes referidos. Comparte tu link para empezar.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {directos.map((d) => (
                <li key={d.clave} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    {nombrePublico(d.nombre)}
                    {d.sinCuenta && <span className="ml-2 text-xs text-muted-foreground">(compró sin crear cuenta)</span>}
                  </span>
                  <span className="text-muted-foreground">Desde {formatoFechaCorta(d.creadoEn.toISOString().slice(0, 10))}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
