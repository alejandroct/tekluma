import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import type { MazoCatalogo } from "@tekluma/shared";
import { db } from "../db/client";
import { deckReleases, decks, standards } from "../db/schema";

export const catalogo = new Hono().get("/", async (c) => {
  // Latest release of each deck; decks never published are not listed.
  const ultima = db
    .selectDistinctOn([deckReleases.deckId], { deckId: deckReleases.deckId, version: deckReleases.version, cardCount: deckReleases.cardCount })
    .from(deckReleases)
    .orderBy(deckReleases.deckId, desc(deckReleases.version))
    .as("ultima");

  const filas = await db
    .select({
      id: decks.id,
      slug: decks.slug,
      titulo: decks.title,
      descripcion: decks.description,
      disciplina: standards.discipline,
      normaCodigo: standards.code,
      acceso: decks.access,
      totalTarjetas: ultima.cardCount,
      versionPublicada: ultima.version,
    })
    .from(decks)
    .innerJoin(standards, eq(standards.id, decks.standardId))
    .innerJoin(ultima, eq(ultima.deckId, decks.id))
    .orderBy(decks.sortOrder, sql`${decks.title} asc`);

  return c.json(filas satisfies MazoCatalogo[]);
});
