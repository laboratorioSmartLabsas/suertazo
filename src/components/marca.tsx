import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Marca({ className, tamaño = 40, href = "/" }: { className?: string; tamaño?: number; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="Suertazo, ir al inicio">
      <Image src="/escudo.webp" alt="" width={tamaño} height={tamaño} priority className="drop-shadow-[0_2px_8px_rgba(217,169,48,0.35)]" />
      <span className="texto-oro font-heading text-lg font-bold tracking-[0.14em] sm:text-xl">SUERTAZO</span>
    </Link>
  );
}
