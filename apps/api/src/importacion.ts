import { and, eq, inArray, ne } from "drizzle-orm";
import type { Importacion, ResultadoImportacion } from "@tekluma/shared";
import { db } from "./db/client";
import { articles, cardCitations, cards, decks, editorialReviews, standards, standardVersions } from "./db/schema";
import { canonico, huella } from "./util";

export class ImportacionError extends Error {}

export type EstadoImportado = "in_review" | "draft" | "approved";

/**
 * Bulk import of one file (usually a chapter of a standard), all or nothing.
 * Articles are upserted by number (keeping the literal text and its page); decks by slug;
 * identical cards are skipped so the same file can be imported twice safely.
 * A corrected card (`reemplaza`) overwrites the old one in place: same id, so users keep their
 * review progress, and revision + 1, so the app refreshes it once the deck is published again.
 * If an earlier import missed the `reemplaza` and created the corrected version as a separate card,
 * the original still takes the new content and that duplicate is retired (`deprecated`).
 */
export async function importar(datos: Importacion, usuarioId: string, estado: EstadoImportado): Promise<ResultadoImportacion> {
  return db.transaction(async (tx) => {
    // Standard and its current version.
    let [norma] = await tx.select().from(standards).where(eq(standards.code, datos.norma.codigo));
    norma ??= (
      await tx.insert(standards).values({ code: datos.norma.codigo, title: datos.norma.titulo, discipline: datos.norma.disciplina }).returning()
    )[0]!;
    let [version] = await tx
      .select()
      .from(standardVersions)
      .where(and(eq(standardVersions.standardId, norma.id), eq(standardVersions.isCurrent, true)));
    version ??= (
      await tx
        .insert(standardVersions)
        .values({ standardId: norma.id, decree: datos.norma.dispositivo, publishedAt: new Date(datos.norma.publicadaEn), isCurrent: true })
        .returning()
    )[0]!;

    // Articles: create or update by number.
    const existentes = await tx.select().from(articles).where(eq(articles.standardVersionId, version.id));
    const porNumero = new Map(existentes.map((a) => [a.number, a]));
    let creados = 0;
    let actualizados = 0;
    for (const a of datos.articulos) {
      const previo = porNumero.get(a.numero);
      if (!previo) {
        const [nuevo] = await tx
          .insert(articles)
          .values({ standardVersionId: version.id, number: a.numero, heading: a.epigrafe, body: a.texto, sourcePage: a.pagina })
          .returning();
        porNumero.set(a.numero, nuevo!);
        creados++;
      } else if (previo.body !== a.texto || (a.epigrafe && previo.heading !== a.epigrafe) || (a.pagina && previo.sourcePage !== a.pagina)) {
        await tx
          .update(articles)
          .set({ body: a.texto, heading: a.epigrafe ?? previo.heading, sourcePage: a.pagina ?? previo.sourcePage })
          .where(eq(articles.id, previo.id));
        actualizados++;
      }
    }

    const resultado: ResultadoImportacion["mazos"] = [];
    for (const m of datos.mazos) {
      let [mazo] = await tx.select().from(decks).where(eq(decks.slug, m.slug));
      const creado = !mazo;
      mazo ??= (
        await tx
          .insert(decks)
          .values({ slug: m.slug, title: m.titulo, description: m.descripcion, standardId: norma.id, access: m.acceso, sortOrder: m.orden ?? 0 })
          .returning()
      )[0]!;
      if (mazo.standardId !== norma.id) throw new ImportacionError(`El mazo «${m.slug}» ya existe y pertenece a otra norma`);
      // Re-importing a file also fixes the deck's position in the catalog.
      if (!creado && m.orden !== undefined && m.orden !== mazo.sortOrder) await tx.update(decks).set({ sortOrder: m.orden }).where(eq(decks.id, mazo.id));

      const enMazo = await tx.select({ id: cards.id, content: cards.content, revision: cards.revision }).from(cards)
        .where(and(eq(cards.deckId, mazo.id), ne(cards.status, "deprecated")));
      const porContenido = new Map(enMazo.map((c) => [canonico(c.content), c]));
      const porHuella = new Map(enMazo.map((c) => [huella(c.content), c]));
      const citasDe = new Map<string, string[]>();
      if (enMazo.length) {
        const filas = await tx
          .select({ cardId: cardCitations.cardId, number: articles.number, excerpt: cardCitations.excerpt })
          .from(cardCitations)
          .innerJoin(articles, eq(articles.id, cardCitations.articleId))
          .where(inArray(cardCitations.cardId, enMazo.map((c) => c.id)));
        for (const f of filas) citasDe.set(f.cardId, [...(citasDe.get(f.cardId) ?? []), `${f.number}\n${f.excerpt}`]);
      }
      const mismasCitas = (cardId: string, citas: { articulo: string; extracto: string }[]) =>
        canonico((citasDe.get(cardId) ?? []).sort()) === canonico(citas.map((c) => `${c.articulo}\n${c.extracto}`).sort());

      /** Overwrites an existing card with the file's version, as a new revision in the import state. */
      const corregir = async (previa: (typeof enMazo)[number], t: (typeof m.tarjetas)[number], comentario: string) => {
        await tx
          .update(cards)
          .set({ content: t.contenido, revision: previa.revision + 1, status: estado, reviewerId: estado === "approved" ? usuarioId : null, updatedAt: new Date() })
          .where(eq(cards.id, previa.id));
        await tx.delete(cardCitations).where(eq(cardCitations.cardId, previa.id));
        await tx.insert(cardCitations).values(t.citas.map((c) => ({ cardId: previa.id, articleId: porNumero.get(c.articulo)!.id, excerpt: c.extracto })));
        if (estado === "approved") await tx.insert(editorialReviews).values({ cardId: previa.id, reviewerId: usuarioId, approved: true, comment: comentario });
      };

      let nuevas = 0;
      let repetidas = 0;
      let reemplazadas = 0;
      let citasActualizadas = 0;
      let duplicadasRetiradas = 0;
      for (const [i, t] of m.tarjetas.entries()) {
        for (const c of t.citas) {
          if (!porNumero.has(c.articulo)) {
            throw new ImportacionError(`Mazo «${m.slug}», tarjeta ${i + 1}: cita el artículo ${c.articulo}, que no está en el archivo ni en la norma`);
          }
        }
        const clave = canonico(t.contenido);
        const igual = porContenido.get(clave);
        const previa = t.reemplaza?.map((h) => porHuella.get(h)).find((c) => c !== undefined && c.id !== igual?.id);
        if (igual && previa) {
          // The corrected version already entered as a new card: retire it and correct the original below.
          await tx.update(cards).set({ status: "deprecated", updatedAt: new Date() }).where(eq(cards.id, igual.id));
          porContenido.delete(clave);
          porHuella.delete(huella(igual.content));
          duplicadasRetiradas++;
        } else if (igual) {
          // Same content: only its citations may have been fixed.
          if (mismasCitas(igual.id, t.citas)) {
            repetidas++;
          } else {
            await corregir(igual, t, "Citas corregidas al importar por un administrador");
            igual.revision++;
            citasDe.set(igual.id, t.citas.map((c) => `${c.articulo}\n${c.extracto}`));
            citasActualizadas++;
          }
          continue;
        }
        if (previa) {
          await corregir(previa, t, "Corregida al importar por un administrador");
          porHuella.delete(huella(previa.content));
          porContenido.delete(canonico(previa.content));
          porContenido.set(clave, { ...previa, content: t.contenido, revision: previa.revision + 1 });
          citasDe.set(previa.id, t.citas.map((c) => `${c.articulo}\n${c.extracto}`));
          reemplazadas++;
          continue;
        }
        const [tarjeta] = await tx
          .insert(cards)
          .values({ deckId: mazo.id, content: t.contenido, status: estado, authorId: usuarioId, reviewerId: estado === "approved" ? usuarioId : null })
          .returning({ id: cards.id });
        await tx.insert(cardCitations).values(t.citas.map((c) => ({ cardId: tarjeta!.id, articleId: porNumero.get(c.articulo)!.id, excerpt: c.extracto })));
        if (estado === "approved") {
          await tx.insert(editorialReviews).values({ cardId: tarjeta!.id, reviewerId: usuarioId, approved: true, comment: "Aprobada al importar por un administrador" });
        }
        porContenido.set(clave, { id: tarjeta!.id, content: t.contenido, revision: 1 });
        citasDe.set(tarjeta!.id, t.citas.map((c) => `${c.articulo}\n${c.extracto}`));
        nuevas++;
      }
      resultado.push({ slug: m.slug, creado, tarjetasNuevas: nuevas, repetidas, reemplazadas, citasActualizadas, duplicadasRetiradas });
    }

    return {
      norma: datos.norma.codigo,
      articulos: { creados, actualizados },
      mazos: resultado,
      estado,
    };
  });
}
