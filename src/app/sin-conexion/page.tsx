import Image from "next/image";

export const dynamic = "force-static";
export const metadata = { title: "Sin conexión" };

export default function SinConexion() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <Image src="/escudo.webp" alt="" width={96} height={96} />
      <h1 className="font-heading text-2xl font-bold tracking-wide">
        <span className="texto-oro">Sin conexión</span>
      </h1>
      <p className="text-muted-foreground">
        No pudimos conectarnos a Suertazo. Revisa tu internet e inténtalo de nuevo; tus boletas siguen seguras.
      </p>
    </main>
  );
}
