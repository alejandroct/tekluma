import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Sin DATABASE_URL se migra la base local de PGlite (ver src/db/client.ts).
  ...(url ? { dbCredentials: { url } } : { driver: "pglite", dbCredentials: { url: ".pglite" } }),
});
