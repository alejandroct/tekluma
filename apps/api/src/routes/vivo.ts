import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { avanzarVivoSchema, crearVivoSchema, responderVivoSchema, unirseVivoSchema } from "@tekluma/shared";
import { requiereUsuario, type AuthVars } from "../middleware/auth";
import { avanzar, crearPartida, estado, misPartidas, responder, unirse, VivoError } from "../vivo";

async function manejar<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof VivoError) throw new HTTPException(e.status, { message: e.message });
    throw e;
  }
}

const conCodigo = zValidator("param", z.object({ codigo: z.string().regex(/^[A-Za-z0-9]{6}$/) }));

/**
 * Creating needs an account (the app); joining, answering and the projected screen work from the
 * web with no account: players hold a token, the host screen holds the game's key.
 */
export const vivo = new Hono<AuthVars>()
  .post("/", requiereUsuario, zValidator("json", crearVivoSchema), async (c) =>
    c.json(await manejar(() => crearPartida(c.get("usuarioId"), c.req.valid("json"))), 201),
  )
  .get("/mias", requiereUsuario, async (c) => c.json(await misPartidas(c.get("usuarioId"))))
  .get("/:codigo", conCodigo, zValidator("query", z.object({ j: z.string().max(64).optional(), k: z.string().max(64).optional() })), async (c) => {
    const { j, k } = c.req.valid("query");
    return c.json(await manejar(() => estado(c.req.valid("param").codigo, { token: j, clave: k })));
  })
  .post("/:codigo/unirse", conCodigo, zValidator("json", unirseVivoSchema), async (c) =>
    c.json(await manejar(() => unirse(c.req.valid("param").codigo, c.req.valid("json").nombre)), 201),
  )
  .post("/:codigo/responder", conCodigo, zValidator("json", responderVivoSchema), async (c) => {
    const { token, opcion } = c.req.valid("json");
    return c.json(await manejar(() => responder(c.req.valid("param").codigo, token, opcion)));
  })
  .post("/:codigo/avanzar", conCodigo, zValidator("json", avanzarVivoSchema), async (c) =>
    c.json(await manejar(() => avanzar(c.req.valid("param").codigo, c.req.valid("json").clave))),
  );
