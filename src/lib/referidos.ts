import { and, eq, isNull } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { usuarios } from "@/db/schema";

/**
 * Deja a `referidorId` como padrino de `usuarioId` si todavía no tiene uno.
 * Evita autorreferidos y ciclos (que el padrino sea parte de la red del comprador).
 */
export async function vincularPadrino(tx: Tx | typeof db, usuarioId: number, referidorId: number | null): Promise<boolean> {
  if (!referidorId || referidorId === usuarioId) return false;

  let actual: number | null = referidorId;
  for (let i = 0; i < 50 && actual; i++) {
    if (actual === usuarioId) return false;
    const [u]: { padrino: number | null }[] = await tx
      .select({ padrino: usuarios.referidoPorId })
      .from(usuarios)
      .where(eq(usuarios.id, actual))
      .limit(1);
    actual = u?.padrino ?? null;
  }

  const actualizados = await tx
    .update(usuarios)
    .set({ referidoPorId: referidorId })
    .where(and(eq(usuarios.id, usuarioId), isNull(usuarios.referidoPorId)))
    .returning({ id: usuarios.id });
  return actualizados.length > 0;
}
