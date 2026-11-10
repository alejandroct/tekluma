import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { requiereUsuario, type AuthVars } from "../middleware/auth";
import { eliminarSuscriptor } from "../premium";

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
  });
