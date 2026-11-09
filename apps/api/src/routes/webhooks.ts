import { Hono } from "hono";
import { verificarRecompensa } from "../admob";
import { acreditarAnuncio } from "../cupo";

export const webhooks = new Hono()
  /** AdMob llama aquí cuando el usuario termina un anuncio con recompensa. */
  .get("/admob", async (c) => {
    const params = await verificarRecompensa(new URL(c.req.url).search.slice(1));
    if (!params) return c.text("firma inválida", 403);
    const usuarioId = params.get("user_id");
    const transaccion = params.get("transaction_id");
    // AdMob verifica la URL al configurarla con una llamada sin usuario: respondemos 200.
    if (!usuarioId || !transaccion) return c.text("ok");
    await acreditarAnuncio(usuarioId, `admob-${transaccion}`);
    return c.text("ok");
  });
