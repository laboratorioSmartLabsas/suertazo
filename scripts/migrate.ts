import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

try {
  process.loadEnvFile?.(".env");
} catch {}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Migraciones aplicadas.");
}

main().catch((error) => {
  console.error("Error aplicando migraciones:", error instanceof Error ? error.message : error);
  process.exit(1);
});
