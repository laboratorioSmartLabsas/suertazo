"use client";

import { BellRing } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { guardarSuscripcionPush } from "@/app/acciones/cuenta";

function aUint8(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

export function ActivarPush({ clavePublica }: { clavePublica: string | null }) {
  const [estado, setEstado] = useState<"inactivo" | "activando" | "activo">("inactivo");
  if (!clavePublica) return null;

  async function activar() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Tu navegador no admite notificaciones push. Instala la app para recibirlas.");
      return;
    }
    setEstado("activando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        toast.error("No diste permiso para enviar notificaciones.");
        setEstado("inactivo");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const suscripcion =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aUint8(clavePublica!) }));
      const r = await guardarSuscripcionPush(suscripcion.toJSON());
      if (!r.ok) throw new Error();
      setEstado("activo");
      toast.success("Listo: te avisaremos de cada resultado.");
    } catch {
      setEstado("inactivo");
      toast.error("No pudimos activar las notificaciones. Inténtalo de nuevo.");
    }
  }

  return (
    <Button variant="outline" onClick={activar} disabled={estado !== "inactivo"}>
      <BellRing data-icon="inline-start" />
      {estado === "activo" ? "Notificaciones activas" : estado === "activando" ? "Activando..." : "Activar notificaciones push"}
    </Button>
  );
}
