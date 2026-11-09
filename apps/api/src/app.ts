import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { catalogo } from "./routes/catalogo";
import { cupo } from "./routes/cupo";
import { mazosRoutes } from "./routes/mazos";
import { repasos } from "./routes/repasos";
import { webhooks } from "./routes/webhooks";

export const app = new Hono()
  .use(logger())
  .use(cors())
  .get("/salud", (c) => c.json({ ok: true }))
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/catalogo", catalogo)
  .route("/mazos", mazosRoutes)
  .route("/cupo", cupo)
  .route("/repasos", repasos)
  .route("/webhooks", webhooks);

export type AppType = typeof app;
