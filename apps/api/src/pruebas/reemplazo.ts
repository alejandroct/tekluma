/**
 * Local check of the "corrected card replaces the old one" import path.
 * Run: `pnpm --filter @tekluma/api prueba:reemplazo` (PGlite only; refuses a remote database).
 */
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { importacionSchema } from "@tekluma/shared";
import { db } from "../db/client";
import { cardCitations, cards, decks, users } from "../db/schema";
import { importar } from "../importacion";
import { publicarMazo } from "../publicacion";
import { huella } from "../util";

if (process.env.DATABASE_URL) throw new Error("Esta prueba solo corre contra la base local (PGlite): quita DATABASE_URL");

const sufijo = Date.now().toString(36);
const slug = `prueba-reemplazo-${sufijo}`;
const [usuario] = await db
  .insert(users)
  .values({ name: "Prueba", email: `prueba-${sufijo}@tekluma.test`, emailVerified: true })
  .returning();

const archivo = (tarjetas: unknown[]) =>
  importacionSchema.parse({
    formato: "tekluma-mazos/1",
    norma: { codigo: `PRUEBA-${sufijo}`, titulo: "Norma de prueba", disciplina: "structures", dispositivo: "DS de prueba", publicadaEn: "2026-01-01" },
    articulos: [
      { numero: "1.1", texto: "El recubrimiento mínimo es 40 mm." },
      { numero: "1.2", texto: "El factor Cm vale 1,0 con cargas transversales." },
    ],
    mazos: [{ slug, titulo: "Mazo de prueba", tarjetas }],
  });

const vaga = { tipo: "opcion_multiple", pregunta: "¿Cuánto vale Cm?", opciones: ["0,4", "1,0"], correcta: 1 };
const clara = { tipo: "opcion_multiple", pregunta: "Columna con cargas transversales entre apoyos: ¿cuánto vale el factor Cm?", opciones: ["0,4", "1,0"], correcta: 1 };
const estable = { tipo: "concepto", pregunta: "¿Recubrimiento mínimo?", respuesta: "40 mm" };
const citaCm = [{ articulo: "1.2", extracto: "El factor Cm vale 1,0" }];

// 1. First import and publication: two cards.
const r1 = await importar(archivo([{ contenido: vaga, citas: citaCm }, { contenido: estable, citas: [{ articulo: "1.2", extracto: "mal citado" }] }]), usuario!.id, "approved");
assert.deepEqual(r1.mazos[0], { slug, creado: true, tarjetasNuevas: 2, repetidas: 0, reemplazadas: 0, citasActualizadas: 0, duplicadasRetiradas: 0 });
const [mazo] = await db.select().from(decks).where(eq(decks.slug, slug));
await publicarMazo(mazo!.id, usuario!.id);
const antes = await db.select().from(cards).where(eq(cards.deckId, mazo!.id)).orderBy(cards.createdAt);
assert.deepEqual(antes.map((c) => c.status), ["published", "published"]);

// 2. Corrected file: card 1 rewritten (with `reemplaza`), card 2 only gets its citation fixed.
const corregido = archivo([
  { contenido: clara, citas: citaCm, reemplaza: [huella(vaga)] },
  { contenido: estable, citas: [{ articulo: "1.1", extracto: "El recubrimiento mínimo es 40 mm." }] },
]);
const r2 = await importar(corregido, usuario!.id, "approved");
assert.deepEqual(r2.mazos[0], { slug, creado: false, tarjetasNuevas: 0, repetidas: 0, reemplazadas: 1, citasActualizadas: 1, duplicadasRetiradas: 0 });
const despues = await db.select().from(cards).where(eq(cards.deckId, mazo!.id)).orderBy(cards.createdAt);
assert.equal(despues.length, 2, "no se duplican tarjetas");
assert.deepEqual(despues.map((c) => c.id), antes.map((c) => c.id), "conservan su id (y con él el progreso de repaso)");
assert.deepEqual(despues.map((c) => c.revision), [2, 2]);
assert.deepEqual(despues.map((c) => c.status), ["approved", "approved"]);
assert.equal((despues[0]!.content as { pregunta: string }).pregunta, clara.pregunta);
const citas = await db.select().from(cardCitations).where(eq(cardCitations.cardId, despues[1]!.id));
assert.deepEqual(citas.map((c) => c.excerpt), ["El recubrimiento mínimo es 40 mm."]);

// 3. Same corrected file again: nothing changes.
const r3 = await importar(corregido, usuario!.id, "approved");
assert.deepEqual(r3.mazos[0], { slug, creado: false, tarjetasNuevas: 0, repetidas: 2, reemplazadas: 0, citasActualizadas: 0, duplicadasRetiradas: 0 });

// 4. Publishing again ships the corrected text under the same card ids.
const pub = await publicarMazo(mazo!.id, usuario!.id);
assert.deepEqual(pub, { version: 2, totalTarjetas: 2, nuevas: 2 });

// 5. A database that never had the old card simply gets the corrected one as new.
const otro = importacionSchema.parse({ ...corregido, mazos: [{ ...corregido.mazos[0]!, slug: `${slug}-b` }] });
const r5 = await importar(otro, usuario!.id, "approved");
assert.equal(r5.mazos[0]!.tarjetasNuevas, 2);

// 6. A corrected file imported once WITHOUT `reemplaza` duplicated the card; importing it again with
//    `reemplaza` corrects the original (same id) and retires the duplicate.
const slugC = `${slug}-c`;
const conSlug = (a: ReturnType<typeof archivo>) => importacionSchema.parse({ ...a, mazos: [{ ...a.mazos[0]!, slug: slugC }] });
await importar(conSlug(archivo([{ contenido: vaga, citas: citaCm }])), usuario!.id, "approved");
const r6a = await importar(conSlug(archivo([{ contenido: clara, citas: citaCm }])), usuario!.id, "approved");
assert.equal(r6a.mazos[0]!.tarjetasNuevas, 1, "sin `reemplaza` entra duplicada");
const r6b = await importar(conSlug(archivo([{ contenido: clara, citas: citaCm, reemplaza: [huella(vaga)] }])), usuario!.id, "approved");
assert.deepEqual(r6b.mazos[0], { slug: slugC, creado: false, tarjetasNuevas: 0, repetidas: 0, reemplazadas: 1, citasActualizadas: 0, duplicadasRetiradas: 1 });
const [mazoC] = await db.select().from(decks).where(eq(decks.slug, slugC));
const enC = await db.select().from(cards).where(eq(cards.deckId, mazoC!.id)).orderBy(cards.createdAt);
assert.deepEqual(enC.map((c) => [c.status, (c.content as { pregunta: string }).pregunta]), [["approved", clara.pregunta], ["deprecated", clara.pregunta]]);
const r6c = await importar(conSlug(archivo([{ contenido: clara, citas: citaCm, reemplaza: [huella(vaga)] }])), usuario!.id, "approved");
assert.deepEqual([r6c.mazos[0]!.repetidas, r6c.mazos[0]!.duplicadasRetiradas, r6c.mazos[0]!.tarjetasNuevas], [1, 0, 0], "una tercera vez no cambia nada");
assert.equal((await publicarMazo(mazoC!.id, usuario!.id)).totalTarjetas, 1, "la retirada no se publica");

console.log("OK: las tarjetas corregidas reemplazan a las anteriores sin duplicar ni cambiar de id");
process.exit(0);
