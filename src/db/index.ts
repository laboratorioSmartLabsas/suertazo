import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalParaDb = globalThis as unknown as { poolSuertazo?: Pool; dbSuertazo?: NodePgDatabase<typeof schema> };

function crearDb(): NodePgDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta la variable DATABASE_URL para conectar con Postgres.");
  }
  const pool =
    globalParaDb.poolSuertazo ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    });
  globalParaDb.poolSuertazo = pool;
  globalParaDb.dbSuertazo ??= drizzle(pool, { schema });
  return globalParaDb.dbSuertazo;
}

/** La conexión se abre en la primera consulta, así `next build` no necesita DATABASE_URL. */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_destino, propiedad) {
    const real = crearDb();
    const valor = Reflect.get(real, propiedad, real);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
