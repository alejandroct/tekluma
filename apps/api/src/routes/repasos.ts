import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { sincronizarRepasosSchema, type EstadoRepaso } from "@tekluma/shared";
import { db } from "../db/client";
import { cards, reviewStates } from "../db/schema";
import { requiereUsuario, type AuthVars } from "../middleware/auth";

export const repasos = new Hono<AuthVars>()
  .use(requiereUsuario)

  /** The user's saved progress for one deck; the app restores it after (re)downloading the deck. */
  .get("/", zValidator("query", z.object({ mazo: z.uuid() })), async (c) => {
    const filas = await db
      .select({
        tarjetaId: reviewStates.cardId,
        due: reviewStates.due,
        stability: reviewStates.stability,
        difficulty: reviewStates.difficulty,
        reps: reviewStates.reps,
        lapses: reviewStates.lapses,
        state: reviewStates.state,
        lastReview: reviewStates.lastReview,
      })
      .from(reviewStates)
      .innerJoin(cards, eq(cards.id, reviewStates.cardId))
      .where(and(eq(reviewStates.userId, c.get("usuarioId")), eq(cards.deckId, c.req.valid("query").mazo)));
    return c.json(
      filas.map(
        (f): EstadoRepaso => ({
          tarjetaId: f.tarjetaId,
          vence: f.due.toISOString(),
          estabilidad: f.stability,
          dificultad: f.difficulty,
          repeticiones: f.reps,
          fallos: f.lapses,
          estado: f.state,
          ultimoRepaso: f.lastReview?.toISOString() ?? null,
        }),
      ),
    );
  })

  .put("/", zValidator("json", sincronizarRepasosSchema), async (c) => {
    const userId = c.get("usuarioId");
    const { estados } = c.req.valid("json");
    if (estados.length === 0) return c.json({ guardados: 0 });

    // Cards that no longer exist (e.g. deleted) are ignored so they don't block the sync.
    const existentes = new Set(
      (await db.select({ id: cards.id }).from(cards).where(inArray(cards.id, estados.map((e) => e.tarjetaId)))).map((t) => t.id),
    );
    const filas = estados
      .filter((e) => existentes.has(e.tarjetaId))
      .map((e) => ({
        userId,
        cardId: e.tarjetaId,
        due: new Date(e.vence),
        stability: e.estabilidad,
        difficulty: e.dificultad,
        reps: e.repeticiones,
        lapses: e.fallos,
        state: e.estado,
        lastReview: e.ultimoRepaso ? new Date(e.ultimoRepaso) : null,
      }));
    if (filas.length === 0) return c.json({ guardados: 0 });

    // The most recent review wins (useful when studying on two devices).
    await db
      .insert(reviewStates)
      .values(filas)
      .onConflictDoUpdate({
        target: [reviewStates.userId, reviewStates.cardId],
        set: {
          due: sql`excluded.due`,
          stability: sql`excluded.stability`,
          difficulty: sql`excluded.difficulty`,
          reps: sql`excluded.reps`,
          lapses: sql`excluded.lapses`,
          state: sql`excluded.state`,
          lastReview: sql`excluded.last_review`,
          updatedAt: sql`now()`,
        },
        setWhere: sql`${reviewStates.lastReview} is null or excluded.last_review > ${reviewStates.lastReview}`,
      });

    return c.json({ guardados: filas.length });
  });
