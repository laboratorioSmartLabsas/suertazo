import type { Metadata } from "next";
import type { ReactNode } from "react";
import { and, eq, sql } from "drizzle-orm";
import { NavAdmin } from "@/components/admin/nav-admin";
import { Encabezado } from "@/components/sitio/encabezado";
import { db } from "@/db";
import { ordenes } from "@/db/schema";
import { requerirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Panel del máster", template: "%s · Máster Suertazo" }, robots: { index: false } };

export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  await requerirAdmin();
  const [{ pendientes }] = await db
    .select({ pendientes: sql<number>`count(*)::int` })
    .from(ordenes)
    .where(and(eq(ordenes.estado, "pendiente")));
  return (
    <>
      <Encabezado />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-3 hidden px-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary lg:block">Panel del máster</p>
          <NavAdmin pendientes={pendientes} />
        </aside>
        <main className="flex min-w-0 flex-col gap-6">{children}</main>
      </div>
    </>
  );
}
