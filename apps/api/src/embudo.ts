import { and, eq, isNull } from "drizzle-orm";
import type { EventoEmbudo } from "@tekluma/shared";
import { db } from "./db/client";
import { installEvents } from "./db/schema";

/**
 * Guarda la primera vez que una instalación llega a un paso. Repetir un evento no hace nada.
 * Con sesión, además une toda la instalación al usuario, para seguirla en los pasos que ve la API.
 */
export async function registrarEvento(e: { instalacion: string; evento: EventoEmbudo; plataforma: string }, usuarioId: string | null) {
  await db
    .insert(installEvents)
    .values({ installId: e.instalacion, event: e.evento, platform: e.plataforma, userId: usuarioId })
    .onConflictDoNothing();
  if (usuarioId) {
    await db
      .update(installEvents)
      .set({ userId: usuarioId })
      .where(and(eq(installEvents.installId, e.instalacion), isNull(installEvents.userId)));
  }
}

