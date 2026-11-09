import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { consumirTarjetaSchema } from "@tekluma/shared";
import { acreditarAnuncio, ampliarConMonedas, consumirTarjeta, estadoCupo, estadoRecompensas, hacerCheckIn, type TipoRecompensa } from "../cupo";
import { requiereUsuario, type AuthVars } from "../middleware/auth";
import { sincronizarPremium } from "../premium";

export const cupo = new Hono<AuthVars>()
  .use(requiereUsuario)
  .get("/", async (c) => c.json(await estadoCupo(c.get("usuarioId"))))

  /** La app lo llama antes de mostrar cada tarjeta. */
  .post("/consumir", zValidator("json", consumirTarjetaSchema), async (c) => {
    const resultado = await consumirTarjeta(c.get("usuarioId"), c.req.valid("json").tarjetaId);
    if (!resultado) throw new HTTPException(404, { message: "Tarjeta no encontrada" });
    return c.json(resultado, resultado.permitido ? 200 : 429);
  })

  .post("/monedas", async (c) => {
    const resultado = await ampliarConMonedas(c.get("usuarioId"));
    return c.json(resultado, resultado.ampliado ? 200 : 402);
  })

  /** La app lo llama tras comprar o restaurar, para no esperar al webhook de RevenueCat. */
  .post("/premium/sincronizar", async (c) => {
    await sincronizarPremium(c.get("usuarioId"));
    return c.json(await estadoCupo(c.get("usuarioId")));
  })

  /**
   * Solo desarrollo: simula la recompensa de un anuncio. En producción la acredita
   * AdMob llamando a /webhooks/admob (verificación del lado del servidor).
   */
  .post("/anuncio-prueba", async (c) => {
    if (process.env.NODE_ENV === "production") throw new HTTPException(404);
    const tipo: TipoRecompensa = c.req.query("tipo") === "monedas" ? "monedas" : "tarjetas";
    const { acreditado } = await acreditarAnuncio(c.get("usuarioId"), `prueba-${randomUUID()}`, tipo);
    return c.json({ acreditado, estado: await estadoCupo(c.get("usuarioId")) });
  })

  /** Rewards screen: daily check-in and coin ads. */
  .get("/recompensas", async (c) => c.json(await estadoRecompensas(c.get("usuarioId"))))
  .post("/recompensas/check-in", async (c) => c.json(await hacerCheckIn(c.get("usuarioId"))));
