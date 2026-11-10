import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { intentoDiariaSchema } from "@tekluma/shared";
import { auth } from "../auth";
import { DiariaError, intentar, verPregunta } from "../diaria";

/** Public: the web page plays without an account; with a session the app gets coins and a streak. */
async function usuarioOpcional(c: Context) {
  const sesion = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
  return sesion?.user.id ?? null;
}

export const diaria = new Hono()
  .get("/", async (c) => {
    const pregunta = await verPregunta(await usuarioOpcional(c));
    if (!pregunta) throw new HTTPException(404, { message: "Hoy no hay pregunta" });
    // The same question for everyone until midnight (Lima); per-user state is never cached.
    c.header("Cache-Control", "private, no-store");
    return c.json(pregunta);
  })

  .post("/intento", zValidator("json", intentoDiariaSchema), async (c) => {
    const { numero, opcion, previas } = c.req.valid("json");
    try {
      return c.json(await intentar(await usuarioOpcional(c), numero, opcion, previas));
    } catch (e) {
      if (e instanceof DiariaError) throw new HTTPException(e.status, { message: e.message });
      throw e;
    }
  });
