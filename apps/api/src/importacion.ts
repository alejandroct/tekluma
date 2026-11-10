import { and, eq } from "drizzle-orm";
import type { Importacion, ResultadoImportacion } from "@tekluma/shared";
import { db } from "./db/client";
import { articles, cardCitations, cards, decks, editorialReviews, standards, standardVersions } from "./db/schema";
import { canonico } from "./util";

export class ImportacionError extends Error {}

export type EstadoImportado = "in_review" | "draft" | "approved";

/**
 * Bulk import of one file (usually a chapter of a standard), all or nothing.
 * Articles are upserted by number (keeping the literal text and its page); decks by slug;
 * identical cards are skipped so the same file can be imported twice safely.
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

      const yaEstan = new Set((await tx.select({ content: cards.content }).from(cards).where(eq(cards.deckId, mazo.id))).map((c) => canonico(c.content)));
      let nuevas = 0;
      let repetidas = 0;
      for (const [i, t] of m.tarjetas.entries()) {
        const clave = canonico(t.contenido);
        if (yaEstan.has(clave)) {
          repetidas++;
          continue;
        }
        for (const c of t.citas) {
          if (!porNumero.has(c.articulo)) {
            throw new ImportacionError(`Mazo «${m.slug}», tarjeta ${i + 1}: cita el artículo ${c.articulo}, que no está en el archivo ni en la norma`);
          }
        }
        const [tarjeta] = await tx
          .insert(cards)
          .values({ deckId: mazo.id, content: t.contenido, status: estado, authorId: usuarioId, reviewerId: estado === "approved" ? usuarioId : null })
          .returning({ id: cards.id });
        await tx.insert(cardCitations).values(t.citas.map((c) => ({ cardId: tarjeta!.id, articleId: porNumero.get(c.articulo)!.id, excerpt: c.extracto })));
        if (estado === "approved") {
          await tx.insert(editorialReviews).values({ cardId: tarjeta!.id, reviewerId: usuarioId, approved: true, comment: "Aprobada al importar por un administrador" });
        }
        yaEstan.add(clave);
        nuevas++;
      }
      resultado.push({ slug: m.slug, creado, tarjetasNuevas: nuevas, repetidas });
    }

    return {
      norma: datos.norma.codigo,
      articulos: { creados, actualizados },
      mazos: resultado,
      estado,
    };
  });
}
