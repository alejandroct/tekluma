import { migrate } from "drizzle-orm/neon-serverless/migrator";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { db } from "../db/client";
import { sembrar } from "../semilla";

/**
 * Runs on every deploy (see sst.config.ts): applies pending migrations and, outside
 * production, loads the demo content. The migrations folder is copied next to the handler.
 */
export const handler = async () => {
  await migrate(db as unknown as NeonDatabase, { migrationsFolder: "drizzle" });
  const semilla = process.env.SEMBRAR === "1" ? await sembrar() : [];
  console.log("Migraciones aplicadas", semilla);
  return { ok: true, semilla };
};
