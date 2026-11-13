import { randomBytes, randomInt } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { VIVO, type ContenidoTarjeta, type EstadoVivo, type FaseVivo } from "@tekluma/shared";
import { db } from "./db/client";
import { cards, decks, liveAnswers, liveGames, livePlayers, standards } from "./db/schema";

export class VivoError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

type OpcionMultiple = Extract<ContenidoTarjeta, { tipo: "opcion_multiple" }>;
type Partida = typeof liveGames.$inferSelect;

/** Six characters without 0/O or 1/I/L: easy to read aloud in a classroom. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const nuevoCodigo = () => Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
const secreto = () => randomBytes(18).toString("base64url");

export async function crearPartida(hostId: string, datos: { norma?: string; preguntas: number; segundos: number }) {
  const pool = await db
    .select({ id: cards.id, norma: standards.code })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .innerJoin(standards, eq(standards.id, decks.standardId))
    .where(
      and(
        eq(cards.status, "published"),
        eq(decks.access, "free"),
        sql`${cards.content}->>'tipo' = 'opcion_multiple'`,
        datos.norma ? eq(standards.code, datos.norma) : undefined,
      ),
    );
  if (pool.length < datos.preguntas) throw new VivoError(409, "Todavía no hay suficientes preguntas para una partida de esta norma");
  for (let i = 0; i < datos.preguntas; i++) {
    const j = i + randomInt(pool.length - i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const elegidas = pool.slice(0, datos.preguntas);
  const normas = [...new Set(elegidas.map((c) => c.norma))];
  for (let intento = 0; intento < 5; intento++) {
    const [p] = await db
      .insert(liveGames)
      .values({
        code: nuevoCodigo(),
        hostId,
        hostKey: secreto(),
        standardCode: normas.length === 1 ? normas[0]! : "RNE",
        cardIds: elegidas.map((c) => c.id),
        questionSeconds: datos.segundos,
      })
      .onConflictDoNothing()
      .returning({ codigo: liveGames.code, clave: liveGames.hostKey });
    if (p) return p;
  }
  throw new Error("No se pudo generar un código de partida");
}

async function partida(codigo: string) {
  const [p] = await db.select().from(liveGames).where(eq(liveGames.code, codigo.toUpperCase()));
  if (!p) throw new VivoError(404, "Esa partida no existe");
  return p;
}

const finDePregunta = (p: Partida) => (p.questionStartedAt?.getTime() ?? 0) + p.questionSeconds * 1000;

/** The stored phase, except that a question closes by itself when its time runs out or everyone answered. */
async function faseEfectiva(p: Partida): Promise<FaseVivo> {
  if (p.phase !== "pregunta") return p.phase;
  if (Date.now() >= finDePregunta(p)) return "revision";
  const [{ jugadores } = { jugadores: 0 }] = await db.select({ jugadores: count() }).from(livePlayers).where(eq(livePlayers.gameId, p.id));
  const [{ respuestas } = { respuestas: 0 }] = await db
    .select({ respuestas: count() })
    .from(liveAnswers)
    .where(and(eq(liveAnswers.gameId, p.id), eq(liveAnswers.questionIndex, p.questionIndex)));
  return jugadores > 0 && respuestas >= jugadores ? "revision" : "pregunta";
}

export async function unirse(codigo: string, nombre: string) {
  const p = await partida(codigo);
  if (p.phase === "fin") throw new VivoError(409, "Esta partida ya terminó");
  const presentes = await db.select({ name: livePlayers.name }).from(livePlayers).where(eq(livePlayers.gameId, p.id));
  if (presentes.length >= VIVO.maxJugadores) throw new VivoError(409, `La sala está llena (${VIVO.maxJugadores} jugadores)`);
  // Two people with the same name: the second becomes «Ana 2».
  const usados = new Set(presentes.map((x) => x.name.toLowerCase()));
  let final = nombre;
  for (let k = 2; usados.has(final.toLowerCase()); k++) final = `${nombre} ${k}`;
  const [jugador] = await db.insert(livePlayers).values({ gameId: p.id, name: final, token: secreto() }).returning();
  return { token: jugador!.token, nombre: jugador!.name };
}

async function pregunta(p: Partida) {
  const id = p.cardIds[p.questionIndex];
  if (!id) return null;
  const [c] = await db.select({ content: cards.content }).from(cards).where(eq(cards.id, id));
  return c ? (c.content as OpcionMultiple) : null;
}

/** Correct and fast earns more: from 1000 points (instant) down to 500 (at the last second). */
const puntos = (p: Partida, ahora: number) => {
  const fraccion = Math.min(1, Math.max(0, (ahora - (p.questionStartedAt?.getTime() ?? ahora)) / (p.questionSeconds * 1000)));
  return Math.round(VIVO.puntosMax - (VIVO.puntosMax - VIVO.puntosMin) * fraccion);
};

export async function responder(codigo: string, token: string, opcion: number) {
  const p = await partida(codigo);
  const [jugador] = await db.select().from(livePlayers).where(and(eq(livePlayers.token, token), eq(livePlayers.gameId, p.id)));
  if (!jugador) throw new VivoError(403, "No estás en esta partida");
  if ((await faseEfectiva(p)) !== "pregunta") throw new VivoError(409, "Se acabó el tiempo de esta pregunta");
  const contenido = await pregunta(p);
  if (!contenido || opcion >= contenido.opciones.length) throw new VivoError(400, "Opción inválida");
  const ganados = opcion === contenido.correcta ? puntos(p, Date.now()) : 0;
  const [guardada] = await db
    .insert(liveAnswers)
    .values({ playerId: jugador.id, gameId: p.id, questionIndex: p.questionIndex, option: opcion, points: ganados })
    .onConflictDoNothing()
    .returning({ points: liveAnswers.points });
  // Only the first answer counts; the score moves only when it was saved.
  if (guardada && ganados) await db.update(livePlayers).set({ score: sql`${livePlayers.score} + ${ganados}` }).where(eq(livePlayers.id, jugador.id));
  return { ok: true };
}

/** Host: lobby → question 1 → reveal → question 2 … → podium. Closing a question early is allowed. */
export async function avanzar(codigo: string, clave: string) {
  const p = await partida(codigo);
  if (clave !== p.hostKey) throw new VivoError(403, "Solo el anfitrión controla la partida");
  const fase = await faseEfectiva(p);
  const ahora = new Date();
  if (fase === "sala" || fase === "revision") {
    const siguiente = p.questionIndex + 1;
    if (siguiente >= p.cardIds.length) await db.update(liveGames).set({ phase: "fin" }).where(eq(liveGames.id, p.id));
    else await db.update(liveGames).set({ phase: "pregunta", questionIndex: siguiente, questionStartedAt: ahora }).where(eq(liveGames.id, p.id));
  } else if (fase === "pregunta") {
    await db.update(liveGames).set({ phase: "revision" }).where(eq(liveGames.id, p.id));
  }
  return { ok: true };
}

/** What every screen polls once a second: the host's (with `clave`) and each player's (with `token`). */
export async function estado(codigo: string, opciones: { token?: string; clave?: string }): Promise<EstadoVivo> {
  const p = await partida(codigo);
  const fase = await faseEfectiva(p);
  const jugadores = await db
    .select({ id: livePlayers.id, nombre: livePlayers.name, puntos: livePlayers.score, token: livePlayers.token })
    .from(livePlayers)
    .where(eq(livePlayers.gameId, p.id))
    .orderBy(desc(livePlayers.score), livePlayers.createdAt);
  const yo = opciones.token ? jugadores.find((j) => j.token === opciones.token) : undefined;
  const base: EstadoVivo = {
    codigo: p.code,
    norma: p.standardCode,
    fase,
    indice: p.questionIndex,
    total: p.cardIds.length,
    segundos: p.questionSeconds,
    ahora: Date.now(),
    inicio: p.questionStartedAt?.getTime() ?? null,
    jugadores: jugadores.length,
    esAnfitrion: !!opciones.clave && opciones.clave === p.hostKey,
  };
  const ranking = jugadores.map((j) => ({ nombre: j.nombre, puntos: j.puntos, ...(j.id === yo?.id ? { soyYo: true } : {}) }));

  if (fase === "sala")
    return {
      ...base,
      nombres: jugadores.map((j) => j.nombre).reverse(),
      ...(yo ? { yo: { nombre: yo.nombre, puntos: 0, posicion: 0, elegida: null, ganados: null } } : {}),
    };

  const respuestas =
    fase === "fin"
      ? []
      : await db
          .select({ playerId: liveAnswers.playerId, option: liveAnswers.option, points: liveAnswers.points })
          .from(liveAnswers)
          .where(and(eq(liveAnswers.gameId, p.id), eq(liveAnswers.questionIndex, p.questionIndex)));
  const mia = yo ? respuestas.find((r) => r.playerId === yo.id) : undefined;
  const yoEstado = yo
    ? {
        nombre: yo.nombre,
        puntos: yo.puntos,
        posicion: jugadores.findIndex((j) => j.id === yo.id) + 1,
        elegida: mia?.option ?? null,
        // Points of this question: only revealed after it closes.
        ganados: fase === "revision" ? (mia?.points ?? 0) : null,
      }
    : undefined;

  if (fase === "fin") return { ...base, ranking, ...(yoEstado ? { yo: yoEstado } : {}) };

  const contenido = await pregunta(p);
  const conPregunta = {
    ...base,
    ...(contenido
      ? { pregunta: { texto: contenido.pregunta, opciones: contenido.opciones, ...(contenido.imagenUrl ? { imagenUrl: contenido.imagenUrl } : {}) } }
      : {}),
    respondieron: respuestas.length,
    ...(yoEstado ? { yo: yoEstado } : {}),
  };
  if (fase === "pregunta") return conPregunta;
  return {
    ...conPregunta,
    correcta: contenido?.correcta,
    reparto: (contenido?.opciones ?? []).map((_, i) => respuestas.filter((r) => r.option === i).length),
    ranking: ranking.slice(0, 10),
  };
}

/** The host's games (to reopen the projector screen from the app). */
export async function misPartidas(hostId: string) {
  return db
    .select({ codigo: liveGames.code, clave: liveGames.hostKey, norma: liveGames.standardCode, fase: liveGames.phase, creadaEn: liveGames.createdAt })
    .from(liveGames)
    .where(eq(liveGames.hostId, hostId))
    .orderBy(desc(liveGames.createdAt))
    .limit(10);
}
