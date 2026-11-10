import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { REGIONES, UNIVERSIDADES, type Region, type Universidad } from "@tekluma/shared";
import { estadoLiga, guardarAfiliacion, rankingRegiones, rankingUniversidades } from "../liga";
import { requiereUsuario, type AuthVars } from "../middleware/auth";

const universidad = z.enum(Object.keys(UNIVERSIDADES) as [Universidad, ...Universidad[]]);
const region = z.enum(Object.keys(REGIONES) as [Region, ...Region[]]);

export const liga = new Hono<AuthVars>()
  // Public rankings (also usable from the website).
  .get("/universidades", async (c) => c.json(await rankingUniversidades()))
  .get("/regiones", async (c) => c.json(await rankingRegiones()))
  .use(requiereUsuario)
  .get("/", async (c) => c.json(await estadoLiga(c.get("usuarioId"))))
  .put("/afiliacion", zValidator("json", z.object({ universidad: universidad.nullable().optional(), region: region.nullable().optional() })), async (c) => {
    await guardarAfiliacion(c.get("usuarioId"), c.req.valid("json"));
    return c.json(await estadoLiga(c.get("usuarioId")));
  });
