import { Hono } from "hono";
import { verificarRecompensa } from "../admob";
import { acreditarAnuncio } from "../cupo";
import { procesarEventoRevenueCat, webhookAutorizado } from "../premium";

export const webhooks = new Hono()
  /** AdMob llama aquí cuando el usuario termina un anuncio con recompensa. */
  .get("/admob", async (c) => {
    const params = await verificarRecompensa(new URL(c.req.url).search.slice(1));
    if (!params) return c.text("firma inválida", 403);
    const usuarioId = params.get("user_id");
    const transaccion = params.get("transaction_id");
    // AdMob verifica la URL al configurarla con una llamada sin usuario: respondemos 200.
    if (!usuarioId || !transaccion) return c.text("ok");
    // custom_data tells what the ad was for ("monedas" from the rewards screen; otherwise cards).
    await acreditarAnuncio(usuarioId, `admob-${transaccion}`, params.get("custom_data") === "monedas" ? "monedas" : "tarjetas");
    return c.text("ok");
  })

  /** RevenueCat avisa compras, renovaciones, cancelaciones y vencimientos de Premium. */
  .post("/revenuecat", async (c) => {
    if (!webhookAutorizado(c.req.header("authorization"))) return c.text("no autorizado", 401);
    const { event } = await c.req.json<{ event: Parameters<typeof procesarEventoRevenueCat>[0] }>();
    await procesarEventoRevenueCat(event);
    return c.text("ok");
  });
