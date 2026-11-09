import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { inArray, sql } from "drizzle-orm";
import { sincronizarRepasosSchema } from "@tekluma/shared";
import { db } from "../db/client";
import { estadosRepaso, tarjetas } from "../db/schema";
import { requiereUsuario, type AuthVars } from "../middleware/auth";

export const repasos = new Hono<AuthVars>()
  .use(requiereUsuario)
  .put("/", zValidator("json", sincronizarRepasosSchema), async (c) => {
    const usuarioId = c.get("usuarioId");
    const { estados } = c.req.valid("json");
    if (estados.length === 0) return c.json({ guardados: 0 });

    // Ignora tarjetas que ya no existen (p. ej. borradas) para no bloquear la sincronización.
    const existentes = new Set(
      (await db.select({ id: tarjetas.id }).from(tarjetas).where(inArray(tarjetas.id, estados.map((e) => e.tarjetaId)))).map((t) => t.id),
    );
    const filas = estados.filter((e) => existentes.has(e.tarjetaId)).map((e) => ({
      usuarioId,
      tarjetaId: e.tarjetaId,
      vence: new Date(e.vence),
      estabilidad: e.estabilidad,
      dificultad: e.dificultad,
      repeticiones: e.repeticiones,
      fallos: e.fallos,
      estado: e.estado,
      ultimoRepaso: e.ultimoRepaso ? new Date(e.ultimoRepaso) : null,
    }));

    if (filas.length === 0) return c.json({ guardados: 0 });

    // Gana el repaso más reciente (útil si el usuario estudia en dos dispositivos).
    await db
      .insert(estadosRepaso)
      .values(filas)
      .onConflictDoUpdate({
        target: [estadosRepaso.usuarioId, estadosRepaso.tarjetaId],
        set: {
          vence: sql`excluded.vence`,
          estabilidad: sql`excluded.estabilidad`,
          dificultad: sql`excluded.dificultad`,
          repeticiones: sql`excluded.repeticiones`,
          fallos: sql`excluded.fallos`,
          estado: sql`excluded.estado`,
          ultimoRepaso: sql`excluded.ultimo_repaso`,
          actualizadoEn: sql`now()`,
        },
        setWhere: sql`${estadosRepaso.ultimoRepaso} is null or excluded.ultimo_repaso > ${estadosRepaso.ultimoRepaso}`,
      });

    return c.json({ guardados: filas.length });
  });
