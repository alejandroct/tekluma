import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import { coinTransactions, supportActions, users } from "./db/schema";
import { darPremiumPromocional, quitarPremiumPromocional } from "./premium";

/** Acciones de soporte desde el panel: cada una queda en la bitácora con quién la hizo y por qué. */

export class SoporteError extends Error {
  constructor(
    readonly status: 404 | 409,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

async function usuario(userId: string) {
  const [u] = await db.select({ premiumUntil: users.premiumUntil }).from(users).where(eq(users.id, userId));
  if (!u) throw new SoporteError(404, "Usuario no encontrado");
  return u;
}

/** Da monedas (o las quita, con un monto negativo). El saldo nunca queda por debajo de cero. */
export async function ajustarMonedas(userId: string, staffId: string, monto: number, nota: string) {
  await usuario(userId);
  return db.transaction(async (tx) => {
    // Mismo candado que el cupo: nadie gasta monedas mientras se ajusta el saldo.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [{ saldo } = { saldo: 0 }] = await tx
      .select({ saldo: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)::int` })
      .from(coinTransactions)
      .where(eq(coinTransactions.userId, userId));
    if (saldo + monto < 0) throw new SoporteError(409, `Solo tiene ${saldo} monedas: no se le pueden quitar ${-monto}`);
    await tx.insert(coinTransactions).values({
      userId,
      amount: monto,
      reason: monto > 0 ? "bonus" : "adjustment",
      reference: `soporte:${randomUUID()}`,
    });
    await tx.insert(supportActions).values({ userId, staffId, kind: "monedas", coins: monto, note: nota });
    return { saldo: saldo + monto };
  });
}

/** Premium por N días, contados desde hoy o desde que vence el que ya tiene. */
export async function darPremium(userId: string, staffId: string, dias: number, nota: string) {
  const { premiumUntil } = await usuario(userId);
  const ahora = new Date();
  const desde = premiumUntil && premiumUntil > ahora ? premiumUntil : ahora;
  const hasta = new Date(desde.getTime() + dias * 86_400_000);
  await darPremiumPromocional(userId, hasta);
  await db.insert(supportActions).values({ userId, staffId, kind: "premium", premiumUntil: hasta, note: nota });
  return { hasta: hasta.toISOString() };
}

export async function quitarPremium(userId: string, staffId: string, nota: string) {
  await usuario(userId);
  await quitarPremiumPromocional(userId);
  await db.insert(supportActions).values({ userId, staffId, kind: "quitar_premium", note: nota });
}

export const historialSoporte = (userId: string) =>
  db
    .select({
      id: supportActions.id,
      kind: supportActions.kind,
      coins: supportActions.coins,
      premiumUntil: supportActions.premiumUntil,
      note: supportActions.note,
      createdAt: supportActions.createdAt,
      staff: users.name,
      staffEmail: users.email,
    })
    .from(supportActions)
    .leftJoin(users, eq(users.id, supportActions.staffId))
    .where(eq(supportActions.userId, userId))
    .orderBy(desc(supportActions.createdAt));
