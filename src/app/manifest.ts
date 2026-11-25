import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suertazo · Rifas que pagan todos los días",
    short_name: "Suertazo",
    description: "Compra tus boletas, sigue los sorteos diarios y gana comisiones con tu red de referidos.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es-CO",
    background_color: "#070807",
    theme_color: "#070807",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mis boletas", url: "/cuenta" },
      { name: "Últimos premios", url: "/premios" },
    ],
  };
}
