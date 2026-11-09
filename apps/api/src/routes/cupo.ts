import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { consumirTarjetaSchema } from "@tekluma/shared";
import { acreditarAnuncio, ampliarConMonedas, consumirTarjeta, estadoCupo } from "../cupo";
import { requiereUsuario, type AuthVars } from "../middleware/auth";

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

  /**
   * Solo desarrollo: simula la recompensa de un anuncio. En producción la acredita
   * AdMob llamando a /webhooks/admob (verificación del lado del servidor).
   */
  .post("/anuncio-prueba", async (c) => {
    if (process.env.NODE_ENV === "production") throw new HTTPException(404);
    return c.json(await acreditarAnuncio(c.get("usuarioId"), `prueba-${randomUUID()}`));
  });
