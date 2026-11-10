import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { crearDueloSchema, jugarDueloSchema } from "@tekluma/shared";
import { auth } from "../auth";
import { crearDuelo, DueloError, jugarDuelo, misDuelos, normasDisponibles, verDuelo, verResultado } from "../duelos";

async function usuarioOpcional(c: Context) {
  const sesion = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
  return sesion?.user.id ?? null;
}

async function usuario(c: Context) {
  const id = await usuarioOpcional(c);
  if (!id) throw new HTTPException(401, { message: "No autenticado" });
  return id;
}

/** Translates domain errors into HTTP responses. */
async function manejar<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DueloError) throw new HTTPException(e.status, { message: e.message });
    throw e;
  }
}

/** Creating needs the app (an account); playing works from the web without one. */
export const duelos = new Hono()
  .get("/normas", async (c) => c.json(await normasDisponibles()))
  .get("/mios", async (c) => c.json(await misDuelos(await usuario(c))))
  .post("/", zValidator("json", crearDueloSchema), async (c) => {
    const id = await usuario(c);
    const codigo = await manejar(() => crearDuelo(id, c.req.valid("json").norma));
    return c.json(await verDuelo(codigo, id), 201);
  })
  .get("/:codigo", async (c) => c.json(await manejar(async () => verDuelo(c.req.param("codigo"), await usuarioOpcional(c)))))
  .get("/:codigo/resultado", async (c) => c.json(await manejar(async () => verResultado(c.req.param("codigo"), await usuarioOpcional(c)))))
  .post("/:codigo/jugar", zValidator("json", jugarDueloSchema), async (c) =>
    c.json(await manejar(async () => jugarDuelo(c.req.param("codigo"), await usuarioOpcional(c), c.req.valid("json")))),
  );
