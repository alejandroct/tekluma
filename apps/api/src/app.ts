import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { catalogo } from "./routes/catalogo";
import { mazosRoutes } from "./routes/mazos";
import { monedas } from "./routes/monedas";
import { repasos } from "./routes/repasos";

export const app = new Hono()
  .use(logger())
  .use(cors())
  .get("/salud", (c) => c.json({ ok: true }))
  .route("/catalogo", catalogo)
  .route("/mazos", mazosRoutes)
  .route("/monedas", monedas)
  .route("/repasos", repasos);

export type AppType = typeof app;
