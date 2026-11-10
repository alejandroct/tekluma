import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { users } from "./db/schema";

/** RevenueCat entitlement that enables Premium. */
export const ENTITLEMENT = "premium";

/** Non-expiring (lifetime) purchases are stored with a far-future date. */
const SIN_VENCIMIENTO = new Date("2999-12-31T00:00:00Z");

const esUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

async function guardarVencimiento(userId: string, hasta: Date | null) {
  await db.update(users).set({ premiumUntil: hasta }).where(eq(users.id, userId));
}

/**
 * Asks RevenueCat (source of truth) and updates `premiumUntil`.
 * Without REVENUECAT_SECRET_KEY it does nothing and returns false.
 */
export async function sincronizarPremium(userId: string) {
  const clave = process.env.REVENUECAT_SECRET_KEY;
  if (!clave || !esUuid(userId)) return false;
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${clave}` },
  });
  if (!res.ok) throw new Error(`RevenueCat respondió ${res.status}`);
  const { subscriber } = (await res.json()) as {
    subscriber: { entitlements: Record<string, { expires_date: string | null } | undefined> };
  };
  const entitlement = subscriber.entitlements[ENTITLEMENT];
  await guardarVencimiento(userId, !entitlement ? null : entitlement.expires_date ? new Date(entitlement.expires_date) : SIN_VENCIMIENTO);
  return true;
}

/** RevenueCat sends the value configured in its dashboard as the Authorization header. */
export function webhookAutorizado(header: string | undefined) {
  const secreto = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secreto || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secreto}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

type EventoRevenueCat = {
  type: string;
  app_user_id: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
};

/** Events that set the access expiration; CANCELLATION changes nothing (active until it expires). */
const EVENTOS_CON_VENCIMIENTO = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "EXPIRATION",
  "SUBSCRIPTION_EXTENDED",
]);

export async function procesarEventoRevenueCat(evento: EventoRevenueCat) {
  if (!esUuid(evento.app_user_id)) return; // anonymous RevenueCat users: no Tekluma account yet
  // With the secret key the full state is fetched; more robust against out-of-order events.
  if (await sincronizarPremium(evento.app_user_id)) return;
  if (!EVENTOS_CON_VENCIMIENTO.has(evento.type) || !evento.entitlement_ids?.includes(ENTITLEMENT)) return;
  await guardarVencimiento(evento.app_user_id, evento.expiration_at_ms ? new Date(evento.expiration_at_ms) : SIN_VENCIMIENTO);
}

/** Deletes the customer from RevenueCat when the account is deleted. Does not cancel store subscriptions. */
export async function eliminarSuscriptor(userId: string) {
  const clave = process.env.REVENUECAT_SECRET_KEY;
  if (!clave) return;
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${clave}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`RevenueCat respondió ${res.status}`);
}
