import { createHash } from "node:crypto";
import { and, desc, eq, gte, notInArray, sql } from "drizzle-orm";
import type { ContenidoTarjeta, EstadoDiaria, PreguntaDiaria, SolucionDiaria } from "@tekluma/shared";
import { fechaLima } from "./cupo";
import { sumarPuntos } from "./liga";
import { db } from "./db/client";
import { articles, cardCitations, cards, coinTransactions, dailyAnswers, dailyQuestions, decks, standards } from "./db/schema";

/** #1 is the launch day; the number is what people share ("Tekluma #128"). */
const LANZAMIENTO = "2026-11-01";
export const INTENTOS_MAX = 3;
/** Coins for solving on the 1st, 2nd or 3rd try. */
export const PREMIOS = (process.env.MONEDAS_DIARIA ?? "10,5,3").split(",").map(Number);
/** League points: by attempt when solved; playing and failing still counts a little. */
const PUNTOS = [10, 7, 5];
const PUNTOS_SIN_RESOLVER = 2;
/** A card is not repeated as the daily question within this many days. */
const SIN_REPETIR_DIAS = 120;

const DIA = 86_400_000;
export const numeroDe = (dia: string) => Math.round((Date.parse(dia) - Date.parse(LANZAMIENTO)) / DIA) + 1;
const diaAnterior = (dia: string) => new Date(Date.parse(dia) - DIA).toISOString().slice(0, 10);

type OpcionMultiple = Extract<ContenidoTarjeta, { tipo: "opcion_multiple" }>;
type Pregunta = { day: string; numero: number; norma: string; contenido: OpcionMultiple; solucion: SolucionDiaria };

/**
 * Today's question. The first request of the day picks it deterministically among published
 * multiple-choice cards of free decks that were not used recently, and stores it.
 */
export async function preguntaDelDia(day = fechaLima()): Promise<Pregunta | null> {
  let [fila] = await db.select({ cardId: dailyQuestions.cardId }).from(dailyQuestions).where(eq(dailyQuestions.day, day));
  if (!fila) {
    const recientes = db
      .select({ cardId: dailyQuestions.cardId })
      .from(dailyQuestions)
      .where(gte(dailyQuestions.day, new Date(Date.parse(day) - SIN_REPETIR_DIAS * DIA).toISOString().slice(0, 10)));
    const candidatas = await db
      .select({ id: cards.id })
      .from(cards)
      .innerJoin(decks, eq(decks.id, cards.deckId))
      .where(
        and(
          eq(cards.status, "published"),
          eq(decks.access, "free"),
          sql`${cards.content}->>'tipo' = 'opcion_multiple'`,
          notInArray(cards.id, recientes),
        ),
      )
      .orderBy(cards.id);
    // If every card was used recently, allow repeats rather than having no question.
    const pool = candidatas.length
      ? candidatas
      : await db
          .select({ id: cards.id })
          .from(cards)
          .innerJoin(decks, eq(decks.id, cards.deckId))
          .where(and(eq(cards.status, "published"), eq(decks.access, "free"), sql`${cards.content}->>'tipo' = 'opcion_multiple'`))
          .orderBy(cards.id);
    if (pool.length === 0) return null;
    const indice = createHash("sha256").update(day).digest().readUInt32BE(0) % pool.length;
    await db.insert(dailyQuestions).values({ day, number: numeroDe(day), cardId: pool[indice]!.id }).onConflictDoNothing();
    [fila] = await db.select({ cardId: dailyQuestions.cardId }).from(dailyQuestions).where(eq(dailyQuestions.day, day));
  }

  const [tarjeta] = await db
    .select({ content: cards.content, norma: standards.code })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .innerJoin(standards, eq(standards.id, decks.standardId))
    .where(eq(cards.id, fila!.cardId));
  if (!tarjeta || tarjeta.content.tipo !== "opcion_multiple") return null;
  const [cita] = await db
    .select({ articulo: articles.number, extracto: cardCitations.excerpt })
    .from(cardCitations)
    .innerJoin(articles, eq(articles.id, cardCitations.articleId))
    .where(eq(cardCitations.cardId, fila!.cardId))
    .limit(1);

  return {
    day,
    numero: numeroDe(day),
    norma: tarjeta.norma,
    contenido: tarjeta.content,
    solucion: { correcta: tarjeta.content.correcta, explicacion: tarjeta.content.explicacion, cita },
  };
}

/** State after a list of guesses (shared by the app, with the DB copy, and the web, with its own). */
function evaluar(p: Pregunta, intentos: number[]): EstadoDiaria {
  const resuelta = intentos.includes(p.solucion.correcta);
  const terminada = resuelta || intentos.length >= INTENTOS_MAX;
  return { intentos, resuelta, terminada, ...(terminada ? { solucion: p.solucion } : {}) };
}

async function racha(userId: string, hoy: string) {
  const dias = await db
    .select({ day: dailyAnswers.day })
    .from(dailyAnswers)
    .where(and(eq(dailyAnswers.userId, userId), sql`${dailyAnswers.finishedAt} is not null`))
    .orderBy(desc(dailyAnswers.day))
    .limit(400);
  let esperado = dias[0]?.day === hoy ? hoy : diaAnterior(hoy);
  let n = 0;
  for (const { day } of dias) {
    if (day !== esperado) break;
    n++;
    esperado = diaAnterior(esperado);
  }
  return n;
}

async function estadoUsuario(p: Pregunta, userId: string): Promise<EstadoDiaria> {
  const [fila] = await db.select().from(dailyAnswers).where(and(eq(dailyAnswers.userId, userId), eq(dailyAnswers.day, p.day)));
  const estado = evaluar(p, fila?.guesses ?? []);
  const monedas = estado.resuelta ? (PREMIOS[estado.intentos.length - 1] ?? 0) : 0;
  return { ...estado, racha: await racha(userId, p.day), monedas };
}

export function vistaPublica(p: Pregunta, estado: EstadoDiaria): PreguntaDiaria {
  return {
    numero: p.numero,
    fecha: p.day,
    norma: p.norma,
    pregunta: p.contenido.pregunta,
    opciones: p.contenido.opciones,
    intentosMax: INTENTOS_MAX,
    premios: PREMIOS,
    estado,
  };
}

export async function verPregunta(userId: string | null) {
  const p = await preguntaDelDia();
  if (!p) return null;
  return vistaPublica(p, userId ? await estadoUsuario(p, userId) : evaluar(p, []));
}

export class DiariaError extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/**
 * One guess. With a session it is recorded server-side (no retries, coins on solve);
 * without one (web page) the browser sends its previous guesses and nothing is stored.
 */
export async function intentar(userId: string | null, numero: number, opcion: number, previas: number[]): Promise<EstadoDiaria> {
  const p = await preguntaDelDia();
  if (!p) throw new DiariaError(404, "Hoy no hay pregunta");
  if (numero !== p.numero) throw new DiariaError(409, "La pregunta del día ya cambió");
  if (opcion >= p.contenido.opciones.length) throw new DiariaError(400, "Opción inválida");

  if (!userId) {
    const antes = evaluar(p, [...new Set(previas)].filter((o) => o < p.contenido.opciones.length).slice(0, INTENTOS_MAX));
    if (antes.terminada) return antes;
    return evaluar(p, antes.intentos.includes(opcion) ? antes.intentos : [...antes.intentos, opcion]);
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [fila] = await tx.select().from(dailyAnswers).where(and(eq(dailyAnswers.userId, userId), eq(dailyAnswers.day, p.day)));
    const antes = evaluar(p, fila?.guesses ?? []);
    if (antes.terminada || antes.intentos.includes(opcion)) return;
    const despues = evaluar(p, [...antes.intentos, opcion]);
    await tx
      .insert(dailyAnswers)
      .values({ userId, day: p.day, guesses: despues.intentos, solved: despues.resuelta, finishedAt: despues.terminada ? new Date() : null })
      .onConflictDoUpdate({
        target: [dailyAnswers.userId, dailyAnswers.day],
        set: { guesses: despues.intentos, solved: despues.resuelta, finishedAt: despues.terminada ? new Date() : null },
      });
    if (despues.terminada) {
      const puntos = despues.resuelta ? (PUNTOS[despues.intentos.length - 1] ?? 0) : PUNTOS_SIN_RESOLVER;
      await sumarPuntos(tx, userId, "daily_question", `${userId}:${p.day}`, puntos);
    }
    const premio = PREMIOS[despues.intentos.length - 1] ?? 0;
    if (despues.resuelta && premio > 0) {
      await tx
        .insert(coinTransactions)
        .values({ userId, amount: premio, reason: "daily_question", reference: `${userId}:${p.day}` })
        .onConflictDoNothing();
    }
  });
  return estadoUsuario(p, userId);
}
