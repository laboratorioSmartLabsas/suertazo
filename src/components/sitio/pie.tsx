import Link from "next/link";
import { InstalarApp } from "@/components/instalar-app";
import { Marca } from "@/components/marca";
import { obtenerAjustes } from "@/lib/rifas";

export async function Pie() {
  const config = await obtenerAjustes();
  const whatsapp = config.whatsapp?.replace(/\D/g, "");
  return (
    <footer className="mt-16 border-t borde-oro bg-black/40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Marca tamaño={36} />
          <p className="text-sm text-muted-foreground">
            Rifas que pagan todos los días con el resultado de las loterías de Colombia.
          </p>
          <div>
            <InstalarApp />
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Explora</span>
          <Link href="/#rifas" className="text-muted-foreground hover:text-foreground">Rifas disponibles</Link>
          <Link href="/premios" className="text-muted-foreground hover:text-foreground">Últimos premios</Link>
          <Link href="/terminos" className="text-muted-foreground hover:text-foreground">Términos y condiciones</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Contacto</span>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              WhatsApp {config.whatsapp}
            </a>
          )}
          {config.correoContacto && (
            <a href={`mailto:${config.correoContacto}`} className="text-muted-foreground hover:text-foreground">
              {config.correoContacto}
            </a>
          )}
          <span className="text-muted-foreground">Solo para mayores de 18 años. Juega con responsabilidad.</span>
        </div>
      </div>
    </footer>
  );
}
