import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Con DATABASE_URL se usa Neon (driver por WebSocket, que soporta transacciones).
 * Sin ella, en desarrollo, se usa PGlite: Postgres embebido guardado en `.pglite/`.
 */
async function crearDb(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    return drizzle({ client: new Pool({ connectionString: process.env.DATABASE_URL }), schema });
  }
  if (process.env.NODE_ENV === "production") throw new Error("Falta DATABASE_URL");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return drizzle({ client: new PGlite(".pglite"), schema });
}

export const db = await crearDb();
