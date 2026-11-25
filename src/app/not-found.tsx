import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <Image src="/escudo.webp" alt="" width={96} height={96} />
      <h1 className="font-heading text-2xl font-bold tracking-wide">
        <span className="texto-oro">Esta página no existe</span>
      </h1>
      <p className="text-muted-foreground">El enlace que abriste no está disponible o la rifa ya no está publicada.</p>
      <Link href="/" className={cn(buttonVariants(), "fondo-oro")}>
        Volver al inicio
      </Link>
    </main>
  );
}
