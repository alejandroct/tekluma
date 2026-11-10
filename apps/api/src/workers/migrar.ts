import { migrate } from "drizzle-orm/neon-serverless/migrator";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { db } from "../db/client";

/**
 * Runs on every deploy (see sst.config.ts): applies pending migrations. The demo content is no
 * longer loaded here: real decks come from the panel's importer, and the demo seed would bring
 * back decks that were deleted. For an empty local database, run `pnpm db:seed` by hand.
 * The migrations folder is copied next to the handler.
 */
export const handler = async () => {
  await migrate(db as unknown as NeonDatabase, { migrationsFolder: "drizzle" });
  console.log("Migraciones aplicadas");
  return { ok: true };
};
