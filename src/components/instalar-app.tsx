"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);

  useEffect(() => {
    function alDisponibilizar(e: Event) {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    }
    function alInstalar() {
      setEvento(null);
    }
    window.addEventListener("beforeinstallprompt", alDisponibilizar);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alDisponibilizar);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (!evento) return null;

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setEvento(null);
  }

  return (
    <Button variant="outline" size="sm" onClick={instalar}>
      <Download data-icon="inline-start" />
      Instalar Suertudo
    </Button>
  );
}
