export type Nivel = "tranquilo" | "moderado" | "buena-racha" | "suertudo";

export type ColorSuerte = { nombre: string; hex: string };

export type Suerte = {
  fecha: string;
  puntaje: number;
  numero: number;
  color: ColorSuerte;
  nivel: Nivel;
  mensaje: string;
};

export const COLORES: ColorSuerte[] = [
  { nombre: "Dorado", hex: "#f59e0b" },
  { nombre: "Esmeralda", hex: "#10b981" },
  { nombre: "Turquesa", hex: "#14b8a6" },
  { nombre: "Violeta", hex: "#8b5cf6" },
  { nombre: "Coral", hex: "#f97316" },
  { nombre: "Rosa", hex: "#ec4899" },
  { nombre: "Cielo", hex: "#0ea5e9" },
  { nombre: "Lima", hex: "#84cc16" },
];

const MENSAJES: Record<Nivel, string[]> = {
  tranquilo: [
    "Hoy conviene ir despacio. Una pausa a tiempo puede evitarte un tropiezo.",
    "Día de bajo perfil: observa más y decide menos.",
    "Los astros piden paciencia. Lo que esperas llegará mañana.",
  ],
  moderado: [
    "Suerte equilibrada: algo pequeño saldrá bien si te animas a intentarlo.",
    "Un encuentro casual podría traerte una buena noticia.",
    "Hoy la fortuna acompaña, pero no la des por sentada.",
  ],
  "buena-racha": [
    "Buena racha a la vista. Aprovecha para proponer esa idea que tienes guardada.",
    "Tu intuición está afinada hoy. Confía en tu primera impresión.",
    "Las puertas se abren con facilidad: empuja la que más te interese.",
  ],
  suertudo: [
    "¡Suertudo total! Hoy todo lo que toques tiene chispa de buena fortuna.",
    "Día de milagros pequeños. Comparte tu suerte con alguien cercano.",
    "El universo conspira a tu favor. Pide ese deseo que llevas tiempo guardando.",
  ],
};

export function nivelPara(puntaje: number): Nivel {
  if (puntaje < 30) return "tranquilo";
  if (puntaje < 60) return "moderado";
  if (puntaje < 85) return "buena-racha";
  return "suertudo";
}

export const ETIQUETA_NIVEL: Record<Nivel, string> = {
  tranquilo: "Día tranquilo",
  moderado: "Suerte moderada",
  "buena-racha": "Buena racha",
  suertudo: "¡Suertudo!",
};

export function claveFecha(fecha: Date = new Date()): string {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

export function tirarSuerte(
  fecha: Date = new Date(),
  aleatorio: () => number = Math.random,
): Suerte {
  const puntaje = Math.floor(aleatorio() * 100) + 1;
  const nivel = nivelPara(puntaje);
  const mensajes = MENSAJES[nivel];
  const color = COLORES[Math.floor(aleatorio() * COLORES.length)];
  const numero = Math.floor(aleatorio() * 99) + 1;
  const mensaje = mensajes[Math.floor(aleatorio() * mensajes.length)];

  return { fecha: claveFecha(fecha), puntaje, numero, color, nivel, mensaje };
}

export function esSuerte(valor: unknown): valor is Suerte {
  if (typeof valor !== "object" || valor === null) return false;
  const s = valor as Partial<Suerte>;
  return (
    typeof s.fecha === "string" &&
    typeof s.puntaje === "number" &&
    typeof s.numero === "number" &&
    typeof s.mensaje === "string" &&
    typeof s.nivel === "string" &&
    typeof s.color === "object" &&
    s.color !== null
  );
}
