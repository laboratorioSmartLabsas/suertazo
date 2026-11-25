import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalParaDb = globalThis as unknown as { poolSuertazo?: Pool };

function crearPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta la variable DATABASE_URL para conectar con Postgres.");
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });
}

const pool = globalParaDb.poolSuertazo ?? crearPool();
if (process.env.NODE_ENV !== "production") globalParaDb.poolSuertazo = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
