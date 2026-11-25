import type { ReactNode } from "react";
import { Encabezado } from "@/components/sitio/encabezado";
import { Pie } from "@/components/sitio/pie";

export const dynamic = "force-dynamic";

export default function LayoutSitio({ children }: { children: ReactNode }) {
  return (
    <>
      <Encabezado />
      <div className="flex flex-1 flex-col">{children}</div>
      <Pie />
    </>
  );
}
