import { and, desc, eq, inArray } from "drizzle-orm";
import { paqueteMazoSchema, type PaqueteMazo } from "@tekluma/shared";
import { db } from "./db/client";
import { articles, cardCitations, cards, deckReleases, decks, standards, standardVersions } from "./db/schema";

/**
 * Publishes a new version of a deck with its approved (or already published) cards.
 * The resulting package is immutable: fixing a card means publishing another version.
 */
export async function publicarMazo(deckId: string, publishedBy: string) {
  return db.transaction(async (tx) => {
    const [mazo] = await tx
      .select({ id: decks.id, code: standards.code, title: standards.title, standardId: standards.id })
      .from(decks)
      .innerJoin(standards, eq(standards.id, decks.standardId))
      .where(eq(decks.id, deckId));
    if (!mazo) throw new Error(`Mazo ${deckId} no existe`);

    const [vigente] = await tx
      .select({ decree: standardVersions.decree })
      .from(standardVersions)
      .where(and(eq(standardVersions.standardId, mazo.standardId), eq(standardVersions.isCurrent, true)));

    const filas = await tx
      .select()
      .from(cards)
      .where(and(eq(cards.deckId, deckId), inArray(cards.status, ["approved", "published"])))
      .orderBy(cards.createdAt);
    if (filas.length === 0) throw new Error("El mazo no tiene tarjetas aprobadas");

    const citas = await tx
      .select({ cardId: cardCitations.cardId, articleId: cardCitations.articleId, excerpt: cardCitations.excerpt, number: articles.number })
      .from(cardCitations)
      .innerJoin(articles, eq(articles.id, cardCitations.articleId))
      .where(inArray(cardCitations.cardId, filas.map((t) => t.id)));

    const [ultima] = await tx
      .select({ version: deckReleases.version })
      .from(deckReleases)
      .where(eq(deckReleases.deckId, deckId))
      .orderBy(desc(deckReleases.version))
      .limit(1);
    const version = (ultima?.version ?? 0) + 1;

    // The package keeps the shared (Spanish) contract that the app consumes.
    const paquete: PaqueteMazo = paqueteMazoSchema.parse({
      mazoId: deckId,
      version,
      publicadoEn: new Date().toISOString(),
      norma: { codigo: mazo.code, titulo: mazo.title, version: vigente?.decree ?? "" },
      tarjetas: filas.map((t) => ({
        id: t.id,
        revision: t.revision,
        contenido: t.content,
        citas: citas
          .filter((c) => c.cardId === t.id)
          .map(({ articleId, excerpt, number }) => ({ articuloId: articleId, extracto: excerpt, articulo: number })),
      })),
    });

    await tx.insert(deckReleases).values({ deckId, version, package: paquete, cardCount: filas.length, publishedBy });
    await tx.update(cards).set({ status: "published" }).where(inArray(cards.id, filas.map((t) => t.id)));

    return { version, totalTarjetas: filas.length };
  });
}
