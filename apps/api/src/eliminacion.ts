import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import {
  articles,
  cardCitations,
  cards,
  dailyAnswers,
  dailyCardViews,
  dailyQuestions,
  deckReleases,
  decks,
  duels,
  reviewStates,
  standards,
  standardVersions,
} from "./db/schema";

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

/**
 * Permanently deletes a standard with its versions and articles. Only allowed once it has no
 * decks (delete those first) and no card cites its articles; otherwise returns the reason.
 */
export async function eliminarNorma(standardId: string) {
  return db.transaction(async (tx) => {
    const [norma] = await tx.select({ code: standards.code }).from(standards).where(eq(standards.id, standardId));
    if (!norma) return null;
    const mazos = await tx.select({ title: decks.title }).from(decks).where(eq(decks.standardId, standardId));
    if (mazos.length) return { bloqueo: `Primero elimina sus mazos: ${mazos.map((m) => m.title).join(", ")}` };
    const versiones = (await tx.select({ id: standardVersions.id }).from(standardVersions).where(eq(standardVersions.standardId, standardId))).map((v) => v.id);
    let articulos = 0;
    if (versiones.length) {
      const ids = (await tx.select({ id: articles.id }).from(articles).where(inArray(articles.standardVersionId, versiones))).map((a) => a.id);
      if (ids.length) {
        const [cita] = await tx.select({ cardId: cardCitations.cardId }).from(cardCitations).where(inArray(cardCitations.articleId, ids)).limit(1);
        if (cita) return { bloqueo: "Hay tarjetas de otros mazos que citan sus artículos" };
        await tx.delete(articles).where(inArray(articles.id, ids));
      }
      articulos = ids.length;
      await tx.delete(standardVersions).where(inArray(standardVersions.id, versiones));
    }
    await tx.delete(standards).where(eq(standards.id, standardId));
    return { eliminada: norma.code, articulos };
  });
}
