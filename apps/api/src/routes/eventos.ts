import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eventoEmbudoSchema } from "@tekluma/shared";
import { auth } from "../auth";
import { registrarEvento } from "../embudo";

/** Public: funnel steps from the app, before and after sign-in. The session is optional. */
export const eventos = new Hono().post("/", zValidator("json", eventoEmbudoSchema), async (c) => {
  const sesion = await auth.api.getSession({ headers: c.req.raw.headers });
  await registrarEvento(c.req.valid("json"), sesion?.user.id ?? null);
  return c.body(null, 204);
});
