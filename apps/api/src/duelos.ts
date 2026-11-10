import { randomInt } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  PREGUNTAS_DUELO,
  type ContenidoTarjeta,
  type Duelo,
  type JugadaDuelo,
  type ResultadoDuelo,
  type ResumenDuelo,
} from "@tekluma/shared";
import { db } from "./db/client";
import { cards, decks, duelPlays, duels, standards, users } from "./db/schema";

export class DueloError extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

type OpcionMultiple = Extract<ContenidoTarjeta, { tipo: "opcion_multiple" }>;

/** Without ambiguous characters (0/O, 1/I/L) so it can be dictated or typed. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const nuevoCodigo = () => Array.from({ length: 7 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");

/** "Alejandro Cabrera Tavara" → "Alejandro C." (what the rival sees). */
export const nombreVisible = (nombre: string) => {
  const [primero, segundo] = nombre.trim().split(/\s+/).filter(Boolean);
  if (!primero) return "Ingeniero";
  return segundo ? `${primero} ${segundo[0]!.toUpperCase()}.` : primero;
};

const esOpcionMultiple = sql`${cards.content}->>'tipo' = 'opcion_multiple'`;

/** Published multiple-choice cards of free decks, optionally of one standard ("E.030"). */
async function candidatas(norma?: string) {
  return db
    .select({ id: cards.id, norma: standards.code })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .innerJoin(standards, eq(standards.id, decks.standardId))
    .where(and(eq(cards.status, "published"), eq(decks.access, "free"), esOpcionMultiple, norma ? eq(standards.code, norma) : undefined));
}

/** Standards with enough questions for a duel (what the app offers to choose from). */
export async function normasDisponibles() {
  const filas = await candidatas();
  const conteo = new Map<string, number>();
  for (const f of filas) conteo.set(f.norma, (conteo.get(f.norma) ?? 0) + 1);
  return [...conteo].filter(([, n]) => n >= PREGUNTAS_DUELO).map(([codigo]) => codigo).sort();
}

export async function crearDuelo(creatorId: string, norma?: string) {
  const pool = await candidatas(norma);
  if (pool.length < PREGUNTAS_DUELO) throw new DueloError(409, "Todavía no hay suficientes preguntas para un duelo de esta norma");
  // Fisher–Yates partial shuffle.
  for (let i = 0; i < PREGUNTAS_DUELO; i++) {
    const j = i + randomInt(pool.length - i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const elegidas = pool.slice(0, PREGUNTAS_DUELO);
  const normas = [...new Set(elegidas.map((c) => c.norma))];
  for (let intento = 0; intento < 5; intento++) {
    const [duelo] = await db
      .insert(duels)
      .values({ code: nuevoCodigo(), creatorId, standardCode: normas.length === 1 ? normas[0]! : "RNE", cardIds: elegidas.map((c) => c.id) })
      .onConflictDoNothing()
      .returning({ code: duels.code });
    if (duelo) return duelo.code;
  }
  throw new Error("No se pudo generar un código de duelo");
}

async function cargar(codigo: string) {
  const [duelo] = await db
    .select({ id: duels.id, code: duels.code, norma: duels.standardCode, cardIds: duels.cardIds, creatorId: duels.creatorId, retador: users.name })
    .from(duels)
    .innerJoin(users, eq(users.id, duels.creatorId))
    .where(eq(duels.code, codigo.toUpperCase()));
  if (!duelo) throw new DueloError(404, "Ese duelo no existe");
  const filas = await db.select({ id: cards.id, content: cards.content }).from(cards).where(inArray(cards.id, duelo.cardIds));
  // Keep the duel's order.
  const preguntas = duelo.cardIds.map((id) => {
    const c = filas.find((f) => f.id === id)!.content as OpcionMultiple;
    return { id, contenido: c };
  });
  return { ...duelo, preguntas };
}

async function resultado(duelo: Awaited<ReturnType<typeof cargar>>, userId: string | null, jugadaId?: string): Promise<ResultadoDuelo> {
  const jugadas = await db
    .select()
    .from(duelPlays)
    .where(eq(duelPlays.duelId, duelo.id))
    .orderBy(desc(duelPlays.correct), duelPlays.seconds, duelPlays.createdAt)
    .limit(50);
  const mia = jugadas.find((j) => (jugadaId ? j.id === jugadaId : userId && j.userId === userId));
  return {
    codigo: duelo.code,
    norma: duelo.norma,
    jugadas: jugadas.map(
      (j): JugadaDuelo => ({
        nombre: j.name,
        aciertos: j.correct,
        segundos: Math.round(j.seconds),
        esRetador: j.userId === duelo.creatorId,
        soyYo: j.id === mia?.id,
      }),
    ),
    ...(mia
      ? {
          solucion: duelo.preguntas.map((p, i) => ({
            id: p.id,
            correcta: p.contenido.correcta,
            elegida: mia.answers[i] ?? null,
            explicacion: p.contenido.explicacion,
          })),
        }
      : {}),
  };
}

export async function verDuelo(codigo: string, userId: string | null): Promise<Duelo> {
  const duelo = await cargar(codigo);
  const yaJugado = userId
    ? (await db.select({ id: duelPlays.id }).from(duelPlays).where(and(eq(duelPlays.duelId, duelo.id), eq(duelPlays.userId, userId))))[0]
    : undefined;
  return {
    codigo: duelo.code,
    norma: duelo.norma,
    retador: nombreVisible(duelo.retador),
    soyRetador: userId === duelo.creatorId,
    preguntas: duelo.preguntas.map((p) => ({ id: p.id, pregunta: p.contenido.pregunta, opciones: p.contenido.opciones })),
    ...(yaJugado ? { resultado: await resultado(duelo, userId) } : {}),
  };
}

export async function verResultado(codigo: string, userId: string | null) {
  return resultado(await cargar(codigo), userId);
}

/** Scores the answers on the server; the correct options are only revealed after playing. */
export async function jugarDuelo(
  codigo: string,
  userId: string | null,
  datos: { nombre?: string; respuestas: (number | null)[]; segundos: number },
): Promise<ResultadoDuelo> {
  const duelo = await cargar(codigo);
  let nombre: string;
  if (userId) {
    const [yo] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
    nombre = nombreVisible(yo?.name || "Ingeniero");
    const [previa] = await db.select({ id: duelPlays.id }).from(duelPlays).where(and(eq(duelPlays.duelId, duelo.id), eq(duelPlays.userId, userId)));
    if (previa) return resultado(duelo, userId);
  } else {
    if (!datos.nombre) throw new DueloError(400, "Escribe tu nombre para que tu rival te reconozca");
    nombre = nombreVisible(datos.nombre);
  }
  // Each question must have been seen for at least a moment: less than 1 s per question is not credible.
  const segundos = Math.max(datos.segundos, PREGUNTAS_DUELO);
  const correct = duelo.preguntas.reduce((n, p, i) => n + (datos.respuestas[i] === p.contenido.correcta ? 1 : 0), 0);
  const [jugada] = await db
    .insert(duelPlays)
    .values({ duelId: duelo.id, userId, name: nombre, answers: datos.respuestas, correct, seconds: segundos })
    .onConflictDoNothing()
    .returning({ id: duelPlays.id });
  return resultado(duelo, userId, jugada?.id);
}

/** The duels I created or played, newest first. */
export async function misDuelos(userId: string): Promise<ResumenDuelo[]> {
  const propios = await db.select({ id: duels.id }).from(duels).where(eq(duels.creatorId, userId));
  const jugados = await db.select({ id: duelPlays.duelId }).from(duelPlays).where(eq(duelPlays.userId, userId));
  const ids = [...new Set([...propios, ...jugados].map((d) => d.id))];
  if (ids.length === 0) return [];
  const lista = await db.select().from(duels).where(inArray(duels.id, ids)).orderBy(desc(duels.createdAt)).limit(30);
  const jugadas = await db
    .select()
    .from(duelPlays)
    .where(inArray(duelPlays.duelId, lista.map((d) => d.id)))
    .orderBy(desc(duelPlays.correct), duelPlays.seconds);
  return lista.map((d) => {
    const deEste = jugadas.filter((j) => j.duelId === d.id);
    const mia = deEste.find((j) => j.userId === userId);
    const rivales = deEste.filter((j) => j.id !== mia?.id);
    const mejor = rivales[0];
    return {
      codigo: d.code,
      norma: d.standardCode,
      creadoEn: d.createdAt.toISOString(),
      misAciertos: mia?.correct ?? null,
      rivales: rivales.length,
      mejorRival: mejor
        ? { nombre: mejor.name, aciertos: mejor.correct, segundos: Math.round(mejor.seconds), esRetador: mejor.userId === d.creatorId, soyYo: false }
        : null,
    };
  });
}
