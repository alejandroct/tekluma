import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { inArray, sql } from "drizzle-orm";
import { sincronizarRepasosSchema } from "@tekluma/shared";
import { db } from "../db/client";
import { cards, reviewStates } from "../db/schema";
import { requiereUsuario, type AuthVars } from "../middleware/auth";

export const repasos = new Hono<AuthVars>()
  .use(requiereUsuario)
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
