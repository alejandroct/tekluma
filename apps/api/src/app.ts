import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { auth, origenesWeb } from "./auth";
import { catalogo } from "./routes/catalogo";
import { cuenta } from "./routes/cuenta";
import { cupo } from "./routes/cupo";
import { diaria } from "./routes/diaria";
import { duelos } from "./routes/duelos";
import { eventos } from "./routes/eventos";
import { liga } from "./routes/liga";
import { editorial } from "./routes/editorial";
import { mazosRoutes } from "./routes/mazos";
import { reclamos } from "./routes/reclamos";
import { simulacros } from "./routes/simulacros";
import { repasos } from "./routes/repasos";
import { vivo } from "./routes/vivo";
import { webhooks } from "./routes/webhooks";
import { reportarError } from "./sentry";

export const app = new Hono()
  .use(logger())
  // The panel uses cookie sessions from another subdomain; the mobile app does not need CORS.
  .use(cors({ origin: origenesWeb, credentials: true }))
  .get("/salud", (c) => c.json({ ok: true }))
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/catalogo", catalogo)
  .route("/mazos", mazosRoutes)
  .route("/cuenta", cuenta)
  .route("/cupo", cupo)
  .route("/diaria", diaria)
  .route("/duelos", duelos)
  .route("/eventos", eventos)
  .route("/liga", liga)
  .route("/editorial", editorial)
  .route("/reclamos", reclamos)
  .route("/simulacros", simulacros)
  .route("/repasos", repasos)
  .route("/vivo", vivo)
  .route("/webhooks", webhooks)
  // Expected errors (4xx with a message) go back as they are; anything else is a bug: report it.
  .onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse();
    console.error(error);
    // The auth middlewares leave the user's id in `usuarioId`.
    const { usuarioId } = c.var as { usuarioId?: string };
    reportarError(error, { metodo: c.req.method, ruta: c.req.routePath, usuarioId });
    return c.json({ message: "Algo salió mal. Ya nos llegó el aviso del error." }, 500);
  });

export type AppType = typeof app;
