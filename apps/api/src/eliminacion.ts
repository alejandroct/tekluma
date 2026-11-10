import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import { cards, dailyAnswers, dailyCardViews, dailyQuestions, deckReleases, decks, duels, reviewStates } from "./db/schema";

/**
 * Permanently deletes a deck with its cards and versions, in one transaction. It leaves the
 * catalog, so the app also removes it from devices on the next sync.
 */
export async function eliminarMazo(deckId: string) {
  return db.transaction(async (tx) => {
    const [mazo] = await tx.select({ slug: decks.slug }).from(decks).where(eq(decks.id, deckId));
    if (!mazo) return null;
    const ids = (await tx.select({ id: cards.id }).from(cards).where(eq(cards.deckId, deckId))).map((t) => t.id);
    if (ids.length) {
      // Rows that point at the cards without cascade.
      await tx.delete(reviewStates).where(inArray(reviewStates.cardId, ids));
      await tx.delete(dailyCardViews).where(inArray(dailyCardViews.cardId, ids));
      const dias = (await tx.delete(dailyQuestions).where(inArray(dailyQuestions.cardId, ids)).returning({ day: dailyQuestions.day })).map((d) => d.day);
      if (dias.length) await tx.delete(dailyAnswers).where(inArray(dailyAnswers.day, dias));
      // Duels keep their card ids in JSON: those that used any of these cards can no longer be played.
      await tx.delete(duels).where(sql`${duels.cardIds} ?| array[${sql.join(ids.map((i) => sql`${i}`), sql`, `)}]::text[]`);
      await tx.delete(cards).where(eq(cards.deckId, deckId));
    }
    await tx.delete(deckReleases).where(eq(deckReleases.deckId, deckId));
    await tx.delete(decks).where(eq(decks.id, deckId));
    return { eliminado: mazo.slug, tarjetas: ids.length };
  });
}
