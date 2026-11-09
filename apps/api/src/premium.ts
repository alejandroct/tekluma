import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { usuarios } from "./db/schema";

/** Entitlement configurado en RevenueCat que habilita Premium. */
export const ENTITLEMENT = "premium";

/** Las compras sin vencimiento (de por vida) se guardan con una fecha lejana. */
const SIN_VENCIMIENTO = new Date("2999-12-31T00:00:00Z");

const esUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

async function guardarVencimiento(usuarioId: string, hasta: Date | null) {
  await db.update(usuarios).set({ premiumHasta: hasta }).where(eq(usuarios.id, usuarioId));
}

/**
 * Consulta a RevenueCat (fuente de verdad) y actualiza `premiumHasta`.
 * Sin REVENUECAT_SECRET_KEY no hace nada y devuelve false.
 */
export async function sincronizarPremium(usuarioId: string) {
  const clave = process.env.REVENUECAT_SECRET_KEY;
  if (!clave || !esUuid(usuarioId)) return false;
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(usuarioId)}`, {
    headers: { Authorization: `Bearer ${clave}` },
  });
  if (!res.ok) throw new Error(`RevenueCat respondió ${res.status}`);
  const { subscriber } = (await res.json()) as {
    subscriber: { entitlements: Record<string, { expires_date: string | null } | undefined> };
  };
  const entitlement = subscriber.entitlements[ENTITLEMENT];
  await guardarVencimiento(usuarioId, !entitlement ? null : entitlement.expires_date ? new Date(entitlement.expires_date) : SIN_VENCIMIENTO);
  return true;
}

/** RevenueCat envía el valor configurado en el dashboard como header Authorization. */
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

/** Eventos que fijan el vencimiento del acceso; CANCELLATION no cambia nada (sigue activo hasta vencer). */
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
  if (!esUuid(evento.app_user_id)) return; // usuarios anónimos de RevenueCat: aún sin cuenta en Tekluma
  // Con la clave secreta se consulta el estado completo; es más robusto ante eventos fuera de orden.
  if (await sincronizarPremium(evento.app_user_id)) return;
  if (!EVENTOS_CON_VENCIMIENTO.has(evento.type) || !evento.entitlement_ids?.includes(ENTITLEMENT)) return;
  await guardarVencimiento(evento.app_user_id, evento.expiration_at_ms ? new Date(evento.expiration_at_ms) : SIN_VENCIMIENTO);
}
