import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth, origenesPanel } from "./auth";
import { catalogo } from "./routes/catalogo";
import { cuenta } from "./routes/cuenta";
import { cupo } from "./routes/cupo";
import { editorial } from "./routes/editorial";
import { mazosRoutes } from "./routes/mazos";
import { repasos } from "./routes/repasos";
import { webhooks } from "./routes/webhooks";

export const app = new Hono()
  .use(logger())
  // The panel uses cookie sessions from another subdomain; the mobile app does not need CORS.
  .use(cors({ origin: origenesPanel, credentials: true }))
  .get("/salud", (c) => c.json({ ok: true }))
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/catalogo", catalogo)
  .route("/mazos", mazosRoutes)
  .route("/cuenta", cuenta)
  .route("/cupo", cupo)
  .route("/editorial", editorial)
  .route("/repasos", repasos)
  .route("/webhooks", webhooks);

export type AppType = typeof app;
