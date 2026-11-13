import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { crearSimulacroSchema, entregarSimulacroSchema } from "@tekluma/shared";
import { requiereUsuario, type AuthVars } from "../middleware/auth";
import { crear, entregar, opciones, SimulacroError, ver } from "../simulacros";

/** Translates domain errors (plan limit, not enough questions, not found) into HTTP responses. */
async function manejar<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof SimulacroError) throw new HTTPException(e.status, { message: e.message });
    throw e;
  }
}

const conId = zValidator("param", z.object({ id: z.uuid() }));

export const simulacros = new Hono<AuthVars>()
  .use(requiereUsuario)
  .get("/", async (c) => c.json(await opciones(c.get("usuarioId"))))
  .post("/", zValidator("json", crearSimulacroSchema), async (c) => {
    const usuario = c.get("usuarioId");
    const id = await manejar(() => crear(usuario, c.req.valid("json")));
    return c.json(await ver(id, usuario), 201);
  })
  .get("/:id", conId, async (c) => c.json(await manejar(() => ver(c.req.valid("param").id, c.get("usuarioId")))))
  .post("/:id/entregar", conId, zValidator("json", entregarSimulacroSchema), async (c) =>
    c.json(await manejar(() => entregar(c.req.valid("param").id, c.get("usuarioId"), c.req.valid("json").respuestas))),
  );
