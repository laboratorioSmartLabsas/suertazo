import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { FormularioRifa } from "@/components/admin/formulario-rifa";
import { TituloAdmin } from "@/components/admin/titulo";

export const metadata: Metadata = { title: "Nueva rifa" };

export default function NuevaRifa() {
  return (
    <>
      <TituloAdmin titulo="Nueva rifa" descripcion="Después de crearla podrás agregar los premios." />
      <Card>
        <CardContent>
          <FormularioRifa />
        </CardContent>
      </Card>
    </>
  );
}
