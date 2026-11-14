import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "./db/client";
import { pushTokens, users } from "./db/schema";
import { fechaLima } from "./cupo";

/**
 * Notificaciones push (Expo Push). Por ahora una sola: «tu racha de la pregunta del día está en riesgo»,
 * que la tarea diaria (workers/racha.ts) manda a quien jugó ayer pero todavía no hoy.
 */

const filas = async <T>(consulta: SQL) => ((await db.execute(consulta)) as unknown as { rows: T[] }).rows;
const DIA = 86_400_000;
const diaAnterior = (dia: string) => new Date(Date.parse(dia) - DIA).toISOString().slice(0, 10);

/** Expo token format: ExponentPushToken[xxxx] (or ExpoPushToken[xxxx]). */
export const esTokenExpo = (token: string) => /^Expo(nent)?PushToken\[[\w-]+\]$/.test(token);

/** A device that changes hands (another account on the same phone) moves to the new user. */
export async function guardarToken(userId: string, token: string, plataforma: string) {
  await db
    .insert(pushTokens)
    .values({ token, userId, platform: plataforma })
    .onConflictDoUpdate({ target: pushTokens.token, set: { userId, platform: plataforma, updatedAt: new Date() } });
}

export const borrarToken = (userId: string, token: string) =>
  db.delete(pushTokens).where(and(eq(pushTokens.token, token), eq(pushTokens.userId, userId)));

export async function leerAvisos(userId: string) {
  const [u] = await db.select({ racha: users.streakAlerts }).from(users).where(eq(users.id, userId));
  return { racha: u?.racha ?? true };
}

export const guardarAvisos = (userId: string, avisos: { racha: boolean }) =>
  db.update(users).set({ streakAlerts: avisos.racha }).where(eq(users.id, userId));

type Mensaje = { to: string; title: string; body: string; data?: Record<string, string>; channelId?: string; sound?: "default" };

/**
 * Sends in batches of 100 (Expo's limit). Tokens Expo reports as no longer registered are deleted,
 * so an uninstalled app stops counting. Returns how many were accepted.
 */
export async function enviarPush(mensajes: Mensaje[]) {
  let aceptados = 0;
  for (let i = 0; i < mensajes.length; i += 100) {
    const lote = mensajes.slice(i, i + 100);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(lote),
    });
    if (!res.ok) {
      console.error("Expo Push respondió", res.status, await res.text());
      continue;
    }
    const { data } = (await res.json()) as { data: { status: "ok" | "error"; details?: { error?: string } }[] };
    const muertos: string[] = [];
    data.forEach((ticket, k) => {
      if (ticket.status === "ok") aceptados++;
      else if (ticket.details?.error === "DeviceNotRegistered") muertos.push(lote[k]!.to);
      else console.error("Push rechazado", ticket.details?.error);
    });
    if (muertos.length) await db.delete(pushTokens).where(inArray(pushTokens.token, muertos));
  }
  return aceptados;
}

/**
 * Users whose daily-question streak ends yesterday (2 days or more) and who have not finished
 * today's question yet, with the avisos on and not already warned today.
 */
export async function rachasEnRiesgo(hoy = fechaLima()) {
  const ayer = diaAnterior(hoy);
  return filas<{ userId: string; racha: number }>(sql`
    with candidatos as (
      select u.id from users u
      where u.streak_alerts
        and u.streak_alert_day is distinct from ${hoy}::date
        and exists (select 1 from push_tokens t where t.user_id = u.id)
        and exists (select 1 from daily_answers a where a.user_id = u.id and a.day = ${ayer}::date and a.finished_at is not null)
        and not exists (select 1 from daily_answers a where a.user_id = u.id and a.day = ${hoy}::date and a.finished_at is not null)
    ),
    dias as (
      select a.user_id, a.day, row_number() over (partition by a.user_id order by a.day desc) as n
      from daily_answers a join candidatos c on c.id = a.user_id
      where a.finished_at is not null and a.day <= ${ayer}::date
    )
    -- Consecutive days counted back from yesterday: the n-th most recent day must be yesterday − (n − 1).
    select user_id as "userId", count(*)::int as racha
    from dias
    where day = ${ayer}::date - (n - 1)::int
    group by user_id
    having count(*) >= 2
  `);
}

export async function avisarRachasEnRiesgo(hoy = fechaLima()) {
  const enRiesgo = await rachasEnRiesgo(hoy);
  if (!enRiesgo.length) return { usuarios: 0, enviados: 0 };
  const racha = new Map(enRiesgo.map((r) => [r.userId, r.racha]));
  const tokens = await db.select({ token: pushTokens.token, userId: pushTokens.userId }).from(pushTokens).where(inArray(pushTokens.userId, [...racha.keys()]));
  // Marked before sending: if the task is retried, nobody gets the warning twice.
  await db.update(users).set({ streakAlertDay: hoy }).where(inArray(users.id, [...racha.keys()]));
  const enviados = await enviarPush(
    tokens.map((t) => ({
      to: t.token,
      title: `Tu racha de ${racha.get(t.userId)} días está en riesgo`,
      body: "Todavía no juegas la pregunta del día. Tienes hasta la medianoche para mantenerla.",
      data: { url: "/diaria" },
      channelId: "recordatorios",
      sound: "default",
    })),
  );
  return { usuarios: racha.size, enviados };
}
