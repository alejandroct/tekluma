import { randomUUID } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { EstadoCupo, EstadoRecompensas, ReglasCupo } from "@tekluma/shared";
import { db, type Db } from "./db/client";
import { adRewards, cards, coinTransactions, dailyCardViews, dailyQuotas, users } from "./db/schema";

const num = (valor: string | undefined, porDefecto: number) => (valor ? Number(valor) : porDefecto);

/** Tunable through environment variables without shipping a new app version. */
export const reglas: ReglasCupo = {
  cupoGratis: num(process.env.CUPO_GRATIS, 15),
  cupoBienvenida: num(process.env.CUPO_BIENVENIDA, 30),
  diasBienvenida: num(process.env.CUPO_DIAS_BIENVENIDA, 3),
  tarjetasPorAnuncio: num(process.env.CUPO_TARJETAS_POR_ANUNCIO, 5),
  maxAnunciosDia: num(process.env.CUPO_MAX_ANUNCIOS_DIA, 8),
  maxIntersticialesDia: num(process.env.CUPO_MAX_INTERSTICIALES_DIA, 2),
  tarjetasPorCompraMonedas: num(process.env.CUPO_TARJETAS_POR_COMPRA_MONEDAS, 5),
  monedasPorAnuncio: num(process.env.MONEDAS_POR_ANUNCIO, 5),
  maxAnunciosMonedasDia: num(process.env.MONEDAS_MAX_ANUNCIOS_DIA, 10),
  checkIn: (process.env.MONEDAS_CHECK_IN ?? "5,5,10,10,15,15,30").split(",").map(Number),
};

/** The business day is Lima's, wherever the server runs. */
export function fechaLima(momento = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(momento);
}

const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
const diaAnterior = (dia: string) => new Date(Date.parse(dia) - 86_400_000).toISOString().slice(0, 10);

type Consulta = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Serializes a user's operations so two concurrent requests cannot exceed the limits. */
const bloquearUsuario = (tx: Consulta, userId: string) => tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);

async function saldoMonedas(q: Consulta, userId: string) {
  const [{ saldo } = { saldo: 0 }] = await q
    .select({ saldo: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)::int` })
    .from(coinTransactions)
    .where(eq(coinTransactions.userId, userId));
  return saldo;
}

async function cupoDelDia(q: Consulta, userId: string, day: string) {
  const [fila] = await q.select().from(dailyQuotas).where(and(eq(dailyQuotas.userId, userId), eq(dailyQuotas.day, day)));
  return fila;
}

async function leerEstado(q: Consulta, userId: string, day = fechaLima()): Promise<EstadoCupo> {
  const [usuario] = await q.select({ premiumUntil: users.premiumUntil, createdAt: users.createdAt }).from(users).where(eq(users.id, userId));
  if (!usuario) throw new Error("Usuario no existe");

  const cupo = await cupoDelDia(q, userId, day);
  const [{ usadas } = { usadas: 0 }] = await q
    .select({ usadas: count() })
    .from(dailyCardViews)
    .where(and(eq(dailyCardViews.userId, userId), eq(dailyCardViews.day, day)));

  const enBienvenida = diasEntre(fechaLima(usuario.createdAt), day) < reglas.diasBienvenida;
  const limite = (enBienvenida ? reglas.cupoBienvenida : reglas.cupoGratis) + (cupo?.extraCards ?? 0);

  return {
    fecha: day,
    premium: Boolean(usuario.premiumUntil && usuario.premiumUntil > new Date()),
    limite,
    usadas,
    restantes: Math.max(0, limite - usadas),
    anunciosVistos: cupo?.cardAds ?? 0,
    monedas: await saldoMonedas(q, userId),
    reglas,
  };
}

export const estadoCupo = (userId: string) => leerEstado(db, userId);

/**
 * Records that the user is about to see a card today. A card already seen today does not use
 * quota again; Premium has no limit.
 */
export async function consumirTarjeta(userId: string, cardId: string) {
  const [existe] = await db.select({ id: cards.id }).from(cards).where(eq(cards.id, cardId));
  if (!existe) return null;

  return db.transaction(async (tx) => {
    await bloquearUsuario(tx, userId);
    const day = fechaLima();
    const [yaVista] = await tx
      .select()
      .from(dailyCardViews)
      .where(and(eq(dailyCardViews.userId, userId), eq(dailyCardViews.day, day), eq(dailyCardViews.cardId, cardId)));
    const antes = await leerEstado(tx, userId, day);
    if (!yaVista && !antes.premium && antes.restantes === 0) return { permitido: false, estado: antes };
    if (!yaVista) await tx.insert(dailyCardViews).values({ userId, day, cardId });
    return { permitido: true, estado: await leerEstado(tx, userId, day) };
  });
}

async function sumarAlDia(tx: Consulta, userId: string, day: string, cambios: { extraCards?: number; cardAds?: number; coinAds?: number }) {
  const { extraCards = 0, cardAds = 0, coinAds = 0 } = cambios;
  await tx
    .insert(dailyQuotas)
    .values({ userId, day, extraCards, cardAds, coinAds })
    .onConflictDoUpdate({
      target: [dailyQuotas.userId, dailyQuotas.day],
      set: {
        extraCards: sql`${dailyQuotas.extraCards} + ${extraCards}`,
        cardAds: sql`${dailyQuotas.cardAds} + ${cardAds}`,
        coinAds: sql`${dailyQuotas.coinAds} + ${coinAds}`,
      },
    });
}

export type TipoRecompensa = "tarjetas" | "monedas";

/**
 * Credits a watched rewarded ad: extra cards for today, or coins. The AdMob transaction makes
 * it idempotent; above the daily cap it is recorded but grants nothing.
 */
export async function acreditarAnuncio(userId: string, transaccion: string, tipo: TipoRecompensa = "tarjetas") {
  return db.transaction(async (tx) => {
    await bloquearUsuario(tx, userId);
    const day = fechaLima();
    const [nueva] = await tx.insert(adRewards).values({ transactionId: transaccion, userId, day }).onConflictDoNothing().returning();
    const cupo = await cupoDelDia(tx, userId, day);
    if (!nueva) return { acreditado: false };

    if (tipo === "monedas") {
      if ((cupo?.coinAds ?? 0) >= reglas.maxAnunciosMonedasDia) return { acreditado: false };
      await tx.insert(coinTransactions).values({ userId, amount: reglas.monedasPorAnuncio, reason: "ad", reference: transaccion });
      await sumarAlDia(tx, userId, day, { coinAds: 1 });
    } else {
      if ((cupo?.cardAds ?? 0) >= reglas.maxAnunciosDia) return { acreditado: false };
      await sumarAlDia(tx, userId, day, { extraCards: reglas.tarjetasPorAnuncio, cardAds: 1 });
    }
    return { acreditado: true };
  });
}

/** Trades coins for extra cards today (1 coin = 1 card). */
export async function ampliarConMonedas(userId: string) {
  const costo = reglas.tarjetasPorCompraMonedas;
  return db.transaction(async (tx) => {
    await bloquearUsuario(tx, userId);
    const day = fechaLima();
    const estado = await leerEstado(tx, userId, day);
    if (estado.monedas < costo) return { ampliado: false, estado };
    await tx.insert(coinTransactions).values({ userId, amount: -costo, reason: "extra_cards", reference: randomUUID() });
    await sumarAlDia(tx, userId, day, { extraCards: costo });
    return { ampliado: true, estado: await leerEstado(tx, userId, day) };
  });
}

/** Consecutive check-in days ending on `hasta` (inclusive). */
async function racha(q: Consulta, userId: string, hasta: string) {
  const dias = new Set(
    (
      await q
        .select({ reference: coinTransactions.reference })
        .from(coinTransactions)
        .where(and(eq(coinTransactions.userId, userId), eq(coinTransactions.reason, "check_in")))
        .orderBy(desc(coinTransactions.createdAt))
        .limit(60)
    ).map((f) => f.reference?.split(":")[1]),
  );
  let n = 0;
  for (let dia = hasta; dias.has(dia); dia = diaAnterior(dia)) n++;
  return n;
}

const premioDelDia = (diaDeRacha: number) => reglas.checkIn[(diaDeRacha - 1) % reglas.checkIn.length]!;

async function leerRecompensas(q: Consulta, userId: string, day = fechaLima()): Promise<EstadoRecompensas> {
  const hechoHoy = (await racha(q, userId, day)) > 0;
  const rachaActual = hechoHoy ? await racha(q, userId, day) : await racha(q, userId, diaAnterior(day));
  const cupo = await cupoDelDia(q, userId, day);
  return {
    fecha: day,
    monedas: await saldoMonedas(q, userId),
    checkIn: { hechoHoy, racha: rachaActual, proxima: premioDelDia(rachaActual + 1) },
    anunciosMonedasVistos: cupo?.coinAds ?? 0,
    reglas,
  };
}

export const estadoRecompensas = (userId: string) => leerRecompensas(db, userId);

/** Daily check-in: once per Lima day; the streak raises the reward. */
export async function hacerCheckIn(userId: string) {
  return db.transaction(async (tx) => {
    await bloquearUsuario(tx, userId);
    const day = fechaLima();
    const antes = await leerRecompensas(tx, userId, day);
    if (antes.checkIn.hechoHoy) return { otorgadas: 0, estado: antes };
    const otorgadas = antes.checkIn.proxima;
    // The reference must be unique per reason across all users: "<user>:<day>".
    await tx.insert(coinTransactions).values({ userId, amount: otorgadas, reason: "check_in", reference: `${userId}:${day}` });
    return { otorgadas, estado: await leerRecompensas(tx, userId, day) };
  });
}
