"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { guardarHistorial, leerHistorial, useHistorial } from "@/lib/historial";
import { claveFecha, ETIQUETA_NIVEL, tirarSuerte, type Suerte } from "@/lib/suerte";
import { InstalarApp } from "@/components/instalar-app";

const DURACION_CONSULTA_MS = 900;

function formatearFecha(clave: string): string {
  const [año, mes, dia] = clave.split("-").map(Number);
  const texto = new Date(año, mes - 1, dia).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function Suertudo() {
  const historial = useHistorial();
  const [consultando, setConsultando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const hoy = claveFecha();
  const suertePorHoy = historial?.find((s) => s.fecha === hoy) ?? null;
  const anteriores = historial?.filter((s) => s.fecha !== hoy) ?? [];

  function consultar() {
    setConsultando(true);
    temporizador.current = setTimeout(() => {
      const nueva = tirarSuerte();
      const previo = leerHistorial().filter((s) => s.fecha !== nueva.fecha);
      guardarHistorial([nueva, ...previo]);
      setConsultando(false);
    }, DURACION_CONSULTA_MS);
  }

  function borrarHistorial() {
    guardarHistorial([]);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 sm:pt-12">
      <header className="flex flex-col gap-1 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-amber-700 dark:text-amber-400">
          Tu consulta diaria
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Suertudo</h1>
        <p className="text-muted-foreground">
          Una consulta al día para saber qué tiene reservado la fortuna.
        </p>
      </header>

      <main className="flex flex-col gap-6">
        {historial === null ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Cargando tu suerte...
            </CardContent>
          </Card>
        ) : suertePorHoy ? (
          <ResultadoCard suerte={suertePorHoy} />
        ) : (
          <Card className="overflow-hidden border-amber-200 bg-gradient-to-b from-amber-50 to-background dark:border-amber-900 dark:from-amber-950/40">
            <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
              <div
                className={`flex size-20 items-center justify-center rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300 ${
                  consultando ? "animate-pulse" : ""
                }`}
                aria-hidden="true"
              >
                <Sparkles className={`size-10 ${consultando ? "animate-spin" : ""}`} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">
                  {consultando ? "Consultando a los astros..." : "¿Qué te depara hoy?"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {consultando
                    ? "Un momento, la fortuna está barajando sus cartas."
                    : "Haz tu consulta de hoy y descubre tu puntaje, número y color de la suerte."}
                </p>
              </div>
              <Button size="lg" onClick={consultar} disabled={consultando} className="min-w-56">
                {consultando ? "Consultando..." : "Consultar mi suerte"}
              </Button>
            </CardContent>
          </Card>
        )}

        {suertePorHoy && (
          <p className="text-center text-sm text-muted-foreground">
            Ya consultaste tu suerte hoy. Vuelve mañana para una nueva consulta.
          </p>
        )}

        <section className="flex flex-col gap-3" aria-labelledby="titulo-historial">
          <div className="flex items-center justify-between gap-2">
            <h2 id="titulo-historial" className="text-lg font-semibold">
              Consultas anteriores
            </h2>
            {historial && historial.length > 0 && (
              <Button variant="ghost" size="sm" onClick={borrarHistorial}>
                <Trash2 data-icon="inline-start" />
                Borrar historial
              </Button>
            )}
          </div>

          {historial === null ? null : anteriores.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Aún no tienes consultas anteriores. Las verás aquí cada día.
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {anteriores.map((s) => (
                <li key={s.fecha}>
                  <Card size="sm">
                    <CardContent className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">
                          {formatearFecha(s.fecha)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Número {s.numero} · {s.color.nombre}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Badge variant="secondary">{ETIQUETA_NIVEL[s.nivel]}</Badge>
                        <span className="w-12 text-right text-lg font-bold tabular-nums">
                          {s.puntaje}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="flex flex-col items-center gap-3 text-center text-xs text-muted-foreground">
        <InstalarApp />
        <p>Suertudo es solo para diversión. La suerte la haces tú.</p>
      </footer>
    </div>
  );
}

function ResultadoCard({ suerte }: { suerte: Suerte }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardDescription>{formatearFecha(suerte.fecha)}</CardDescription>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Tu suerte de hoy</span>
          <Badge>{ETIQUETA_NIVEL[suerte.nivel]}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between">
            <span className="text-sm text-muted-foreground">Puntaje de la suerte</span>
            <span className="text-5xl font-bold tabular-nums">{suerte.puntaje}</span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-label="Puntaje de la suerte"
            aria-valuemin={1}
            aria-valuemax={100}
            aria-valuenow={suerte.puntaje}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-600 transition-all duration-700"
              style={{ width: `${suerte.puntaje}%` }}
            />
          </div>
        </div>

        <p className="text-base leading-relaxed">{suerte.mensaje}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Número de la suerte
            </span>
            <span className="text-3xl font-bold tabular-nums">{suerte.numero}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Color de la suerte
            </span>
            <div className="flex items-center gap-2">
              <span
                className="size-6 rounded-full border"
                style={{ backgroundColor: suerte.color.hex }}
                aria-hidden="true"
              />
              <span className="text-lg font-semibold">{suerte.color.nombre}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
