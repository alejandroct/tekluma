import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { movimientosMonedas } from "../db/schema";
import { requiereUsuario, type AuthVars } from "../middleware/auth";

// TODO: endpoint de recompensa por anuncio vía AdMob SSV (verificación de firma) e IAP vía webhook de RevenueCat.
export const monedas = new Hono<AuthVars>().use(requiereUsuario).get("/saldo", async (c) => {
  const [{ saldo } = { saldo: 0 }] = await db
    .select({ saldo: sql<number>`coalesce(sum(${movimientosMonedas.cantidad}), 0)::int` })
    .from(movimientosMonedas)
    .where(eq(movimientosMonedas.usuarioId, c.get("usuarioId")));
  return c.json({ saldo });
});
