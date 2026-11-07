import * as SQLite from "expo-sqlite";
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";

const db = SQLite.openDatabaseSync("tekluma.db");
db.execSync(`
  create table if not exists estados (
    tarjeta_id text primary key not null,
    mazo_id text not null,
    vence integer not null,
    tarjeta text not null,
    sincronizado integer not null default 0
  );
  create index if not exists estados_mazo_vence on estados (mazo_id, vence);
`);

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
