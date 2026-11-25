"use client";

import { useEffect } from "react";
import { marcarNotificacionesVistas } from "@/app/acciones/cuenta";

export function MarcarVistas() {
  useEffect(() => {
    marcarNotificacionesVistas();
  }, []);
  return null;
}
