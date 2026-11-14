import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { requiereUsuario, type AuthVars } from "../middleware/auth";
import { eliminarSuscriptor } from "../premium";
import { borrarToken, esTokenExpo, guardarAvisos, guardarToken, leerAvisos } from "../avisos";

const tokenPush = z.string().max(200).refine(esTokenExpo, "Token de notificaciones inválido");

export const cuenta = new Hono<AuthVars>()
  .use(requiereUsuario)

  /**
   * Permanent in-app account deletion (App Store guideline 5.1.1(v)).
   * Sessions, coins, quotas and study progress go with the user via ON DELETE CASCADE.
   */
  .delete("/", async (c) => {
    const id = c.get("usuarioId");
    const [usuario] = await db.select({ staffRole: users.staffRole }).from(users).where(eq(users.id, id));
    if (!usuario) throw new HTTPException(404, { message: "Cuenta no encontrada" });
    // Staff accounts sign editorial history (authorship, reviews, releases) and are closed by an admin.
    if (usuario.staffRole) throw new HTTPException(409, { message: "Las cuentas del equipo editorial se cierran escribiendo a hola@tekluma.app" });
    try {
      await eliminarSuscriptor(id);
    } catch (e) {
      console.error("No se pudo borrar el cliente en RevenueCat", e);
    }
    await db.delete(users).where(eq(users.id, id));
    return c.json({ ok: true });
  })

  /** This device's push token (the app sends it after signing in, if notifications are allowed). */
  .post("/push", zValidator("json", z.object({ token: tokenPush, plataforma: z.enum(["ios", "android"]) })), async (c) => {
    const { token, plataforma } = c.req.valid("json");
    await guardarToken(c.get("usuarioId"), token, plataforma);
    return c.json({ ok: true });
  })

  /** On sign-out: this device stops receiving the account's notifications. */
  .delete("/push", zValidator("json", z.object({ token: tokenPush })), async (c) => {
    await borrarToken(c.get("usuarioId"), c.req.valid("json").token);
    return c.json({ ok: true });
  })

  .get("/avisos", async (c) => c.json(await leerAvisos(c.get("usuarioId"))))

  .put("/avisos", zValidator("json", z.object({ racha: z.boolean() })), async (c) => {
    await guardarAvisos(c.get("usuarioId"), c.req.valid("json"));
    return c.json({ ok: true });
  });
