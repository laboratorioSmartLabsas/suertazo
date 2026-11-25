import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Orbitron } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { RegistroServiceWorker } from "@/components/registro-sw";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });
const orbitron = Orbitron({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:4817"),
  title: { default: "Suertazo · Rifas que pagan todos los días", template: "%s · Suertazo" },
  description:
    "Compra tu boleta de contado o en cuotas, juega sorteos diarios con las loterías de Colombia y gana comisiones refiriendo amigos.",
  applicationName: "Suertazo",
  appleWebApp: { capable: true, title: "Suertazo", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: { title: "Suertazo", description: "Rifas que pagan todos los días.", images: ["/logo-suertazo.webp"] },
};

export const viewport: Viewport = {
  themeColor: "#070807",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} ${orbitron.variable} dark h-full antialiased`}>
      <body className="fondo-marca flex min-h-full flex-col text-foreground">
        {children}
        <Toaster position="top-center" richColors />
        <RegistroServiceWorker />
      </body>
    </html>
  );
}
