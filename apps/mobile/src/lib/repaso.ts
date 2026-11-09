import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";
import type { EstadoRepaso } from "@tekluma/shared";
import { api } from "./auth";
import { db } from "./db";

const planificador = fsrs({ request_retention: 0.9, enable_fuzz: true });

export { Rating };

export function estadoDe(tarjetaId: string): Card {
  const fila = db.getFirstSync<{ tarjeta: string }>("select tarjeta from estados where tarjeta_id = ?", tarjetaId);
  if (!fila) return createEmptyCard(new Date());
  const t = JSON.parse(fila.tarjeta) as Card;
  return { ...t, due: new Date(t.due), last_review: t.last_review ? new Date(t.last_review) : undefined };
}

/** Aplica la calificación del usuario y guarda el nuevo estado (offline; se sincroniza después). */
export function calificar(mazoId: string, tarjetaId: string, nota: Grade): Card {
  const { card } = planificador.next(estadoDe(tarjetaId), new Date(), nota);
  db.runSync(
    `insert into estados (tarjeta_id, mazo_id, vence, tarjeta, sincronizado) values (?, ?, ?, ?, 0)
     on conflict (tarjeta_id) do update set vence = excluded.vence, tarjeta = excluded.tarjeta, sincronizado = 0`,
    tarjetaId,
    mazoId,
    card.due.getTime(),
    JSON.stringify(card),
  );
  return card;
}

/** Tarjetas a estudiar hoy: las vencidas más las nuevas (nunca vistas). */
export function pendientes(mazoId: string, ids: string[]): string[] {
  const ahora = Date.now();
  const vistas = new Map(
    db
      .getAllSync<{ tarjeta_id: string; vence: number }>("select tarjeta_id, vence from estados where mazo_id = ?", mazoId)
      .map((f) => [f.tarjeta_id, f.vence]),
  );
  return ids.filter((id) => {
    const vence = vistas.get(id);
    return vence === undefined || vence <= ahora;
  });
}

/** Sube los estados pendientes a la API; si falla (sin conexión), se reintenta la próxima vez. */
export async function sincronizar() {
  const filas = db.getAllSync<{ tarjeta_id: string; tarjeta: string }>(
    "select tarjeta_id, tarjeta from estados where sincronizado = 0 limit 500",
  );
  if (filas.length === 0) return 0;
  const estados: EstadoRepaso[] = filas.map((f) => {
    const t = JSON.parse(f.tarjeta) as Card & { due: string; last_review?: string };
    return {
      tarjetaId: f.tarjeta_id,
      vence: new Date(t.due).toISOString(),
      estabilidad: t.stability,
      dificultad: t.difficulty,
      repeticiones: t.reps,
      fallos: t.lapses,
      estado: t.state,
      ultimoRepaso: t.last_review ? new Date(t.last_review).toISOString() : null,
    };
  });
  await api("/repasos", { method: "PUT", body: JSON.stringify({ estados }) });
  // Solo marca los que no cambiaron mientras se subían.
  for (const f of filas) {
    db.runSync("update estados set sincronizado = 1 where tarjeta_id = ? and tarjeta = ?", f.tarjeta_id, f.tarjeta);
  }
  return filas.length;
}
