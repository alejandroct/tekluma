import { randomInt } from "node:crypto";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import {
  notaVigesimal,
  SIMULACRO,
  type ContenidoTarjeta,
  type MazoSimulacro,
  type NormaSimulacro,
  type OpcionesSimulacro,
  type ResultadoSimulacro,
  type ResumenSimulacro,
  type Simulacro,
} from "@tekluma/shared";
import { db } from "./db/client";
import { articles, cardCitations, cards, decks, mockExams, standards, users } from "./db/schema";
import { fechaLima } from "./cupo";
import { semanaDe } from "./liga";

export class SimulacroError extends Error {
  constructor(
    readonly status: 403 | 404 | 409,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

type OpcionMultiple = Extract<ContenidoTarjeta, { tipo: "opcion_multiple" }>;

/** Minutes of grace after the time limit before an unsubmitted exam stops being "in progress". */
const GRACIA_MS = 2 * 60_000;

async function esPremium(userId: string) {
  const [u] = await db.select({ premiumUntil: users.premiumUntil }).from(users).where(eq(users.id, userId));
  return Boolean(u?.premiumUntil && u.premiumUntil > new Date());
}

/** Published multiple-choice cards a user can get: from free decks, or any deck with Premium. */
async function candidatas(premium: boolean, norma?: string) {
  return db
    .select({ id: cards.id, norma: standards.code, tituloNorma: standards.title, mazoId: decks.id, mazo: decks.title, orden: decks.sortOrder })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .innerJoin(standards, eq(standards.id, decks.standardId))
    .where(
      and(
        eq(cards.status, "published"),
        sql`${cards.content}->>'tipo' = 'opcion_multiple'`,
        premium ? undefined : eq(decks.access, "free"),
        norma ? eq(standards.code, norma) : undefined,
      ),
    );
}

/** Start of the current Lima week (Monday 00:00 in Lima = 05:00 UTC). */
const inicioSemana = () => new Date(`${semanaDe(fechaLima())}T05:00:00Z`);

const resumen = (e: typeof mockExams.$inferSelect): ResumenSimulacro => ({
  id: e.id,
  norma: e.standardCode,
  total: e.cardIds.length,
  aciertos: e.correct,
  nota: e.correct === null ? null : notaVigesimal(e.correct, e.cardIds.length),
  creadoEn: e.createdAt.toISOString(),
  entregado: e.submittedAt !== null,
});

const vigente = (e: typeof mockExams.$inferSelect) => !e.submittedAt && e.createdAt.getTime() + e.timeLimitSec * 1000 + GRACIA_MS > Date.now();

async function gratisRestantes(userId: string) {
  const [{ n } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(mockExams)
    .where(and(eq(mockExams.userId, userId), gte(mockExams.createdAt, inicioSemana())));
  return Math.max(0, SIMULACRO.gratisPorSemana - n);
}

export async function opciones(userId: string): Promise<OpcionesSimulacro> {
  const premium = await esPremium(userId);
  const pool = await candidatas(premium);
  const normas = new Map<string, NormaSimulacro & { orden: Map<string, number> }>();
  for (const c of pool) {
    const n = normas.get(c.norma) ?? { codigo: c.norma, titulo: c.tituloNorma, mazos: [] as MazoSimulacro[], preguntas: 0, orden: new Map<string, number>() };
    let mazo = n.mazos.find((m) => m.id === c.mazoId);
    if (!mazo) {
      mazo = { id: c.mazoId, titulo: c.mazo, preguntas: 0 };
      n.mazos.push(mazo);
      n.orden.set(c.mazoId, c.orden);
    }
    mazo.preguntas++;
    n.preguntas++;
    normas.set(c.norma, n);
  }
  const lista = [...normas.values()]
    .filter((n) => n.preguntas >= SIMULACRO.largoGratis)
    .map(({ orden, ...n }) => ({ ...n, mazos: n.mazos.sort((a, b) => (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0)) }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

  const examenes = await db.select().from(mockExams).where(eq(mockExams.userId, userId)).orderBy(desc(mockExams.createdAt)).limit(20);
  const enCurso = examenes.find(vigente);
  return {
    normas: lista,
    premium,
    gratisRestantes: premium ? null : await gratisRestantes(userId),
    enCurso: enCurso ? resumen(enCurso) : null,
    historial: examenes.filter((e) => e !== enCurso).map(resumen),
  };
}

export async function crear(userId: string, datos: { norma: string; preguntas: number; mazos?: string[] }) {
  const premium = await esPremium(userId);
  if (!premium) {
    if (datos.preguntas > SIMULACRO.largoGratis) throw new SimulacroError(403, `Los simulacros de ${datos.preguntas} preguntas son de Premium`);
    if ((await gratisRestantes(userId)) === 0)
      throw new SimulacroError(403, "Ya hiciste tu simulacro gratis de esta semana. Con Premium son ilimitados.");
  }
  let pool = await candidatas(premium, datos.norma);
  if (datos.mazos?.length) pool = pool.filter((c) => datos.mazos!.includes(c.mazoId));
  if (pool.length < datos.preguntas)
    throw new SimulacroError(409, `Esos capítulos tienen ${pool.length} preguntas; elige más capítulos o un simulacro más corto`);

  // Fisher–Yates partial shuffle.
  for (let i = 0; i < datos.preguntas; i++) {
    const j = i + randomInt(pool.length - i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const [examen] = await db
    .insert(mockExams)
    .values({
      userId,
      standardCode: datos.norma,
      cardIds: pool.slice(0, datos.preguntas).map((c) => c.id),
      timeLimitSec: datos.preguntas * SIMULACRO.segundosPorPregunta,
    })
    .returning({ id: mockExams.id });
  return examen!.id;
}

async function cargar(id: string, userId: string) {
  const [examen] = await db
    .select()
    .from(mockExams)
    .where(and(eq(mockExams.id, id), eq(mockExams.userId, userId)));
  if (!examen) throw new SimulacroError(404, "Ese simulacro no existe");
  const filas = await db
    .select({ id: cards.id, content: cards.content, mazo: decks.title })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(inArray(cards.id, examen.cardIds));
  // Keep the exam's order; a card deleted since then is dropped.
  const preguntas = examen.cardIds.flatMap((cid) => {
    const f = filas.find((x) => x.id === cid);
    return f ? [{ id: cid, contenido: f.content as OpcionMultiple, mazo: f.mazo }] : [];
  });
  return { examen, preguntas };
}

async function calificar({ examen, preguntas }: Awaited<ReturnType<typeof cargar>>): Promise<ResultadoSimulacro> {
  const respuestas = examen.answers ?? [];
  const citas = preguntas.length
    ? await db
        .select({ cardId: cardCitations.cardId, articulo: articles.number, extracto: cardCitations.excerpt })
        .from(cardCitations)
        .innerJoin(articles, eq(articles.id, cardCitations.articleId))
        .where(inArray(cardCitations.cardId, preguntas.map((p) => p.id)))
    : [];
  const porMazo = new Map<string, { mazo: string; aciertos: number; total: number }>();
  const solucion = preguntas.map((p, i) => {
    const elegida = respuestas[i] ?? null;
    const bien = elegida === p.contenido.correcta;
    const m = porMazo.get(p.mazo) ?? { mazo: p.mazo, aciertos: 0, total: 0 };
    m.total++;
    if (bien) m.aciertos++;
    porMazo.set(p.mazo, m);
    return {
      id: p.id,
      correcta: p.contenido.correcta,
      elegida,
      ...(p.contenido.explicacion ? { explicacion: p.contenido.explicacion } : {}),
      citas: citas.filter((c) => c.cardId === p.id).map(({ articulo, extracto }) => ({ articulo, extracto })),
    };
  });
  const aciertos = solucion.filter((s) => s.elegida === s.correcta).length;
  return {
    total: preguntas.length,
    aciertos,
    nota: notaVigesimal(aciertos, preguntas.length),
    segundos: examen.seconds ?? 0,
    // Worst chapters first: that is what to study next.
    porMazo: [...porMazo.values()].sort((a, b) => a.aciertos / a.total - b.aciertos / b.total),
    solucion,
  };
}

export async function ver(id: string, userId: string): Promise<Simulacro> {
  const datos = await cargar(id, userId);
  const { examen, preguntas } = datos;
  return {
    id: examen.id,
    norma: examen.standardCode,
    iniciado: examen.createdAt.toISOString(),
    limiteSegundos: examen.timeLimitSec,
    preguntas: preguntas.map((p) => ({
      id: p.id,
      pregunta: p.contenido.pregunta,
      ...(p.contenido.imagenUrl ? { imagenUrl: p.contenido.imagenUrl } : {}),
      opciones: p.contenido.opciones,
      mazo: p.mazo,
    })),
    ...(examen.submittedAt ? { resultado: await calificar(datos) } : {}),
  };
}

/** Scores on the server. Submitting twice returns the first result; the time counted never exceeds the limit. */
export async function entregar(id: string, userId: string, respuestas: (number | null)[]): Promise<Simulacro> {
  const { examen, preguntas } = await cargar(id, userId);
  if (!examen.submittedAt) {
    const segundos = Math.min(Math.round((Date.now() - examen.createdAt.getTime()) / 1000), examen.timeLimitSec);
    const correct = preguntas.reduce((n, p, i) => n + (respuestas[i] === p.contenido.correcta ? 1 : 0), 0);
    await db
      .update(mockExams)
      .set({ answers: respuestas.slice(0, examen.cardIds.length), correct, seconds: segundos, submittedAt: new Date() })
      .where(and(eq(mockExams.id, id), isNull(mockExams.submittedAt)));
  }
  return ver(id, userId);
}
