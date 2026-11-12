import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { reclamoSchema } from "@tekluma/shared";
import { registrarReclamo } from "../reclamos";

/**
 * Public: the complaints book form on the website (no account needed, as the law requires).
 * The hidden "web" field (bot trap) must be empty; the schema rejects it otherwise.
 */
export const reclamos = new Hono().post("/", zValidator("json", reclamoSchema), async (c) =>
  c.json(await registrarReclamo(c.req.valid("json")), 201),
);
