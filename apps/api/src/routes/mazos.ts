import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { mazos, publicacionesMazo, usuarios } from "../db/schema";
import { requiereUsuario, type AuthVars } from "../middleware/auth";

export const mazosRoutes = new Hono<AuthVars>()
  .use(requiereUsuario)

  /** Los mazos gratis se descargan libremente (el límite es el cupo diario); los premium requieren suscripción. */
  .get("/:id/paquete", async (c) => {
    const mazoId = c.req.param("id");
    const [mazo] = await db.select({ acceso: mazos.acceso }).from(mazos).where(eq(mazos.id, mazoId));
    if (!mazo) throw new HTTPException(404, { message: "Mazo no encontrado" });

    if (mazo.acceso === "premium") {
      const [usuario] = await db.select({ premiumHasta: usuarios.premiumHasta }).from(usuarios).where(eq(usuarios.id, c.get("usuarioId")));
      if (!(usuario?.premiumHasta && usuario.premiumHasta > new Date())) throw new HTTPException(403, { message: "Mazo Premium" });
    }

    const [pub] = await db
      .select()
      .from(publicacionesMazo)
      .where(eq(publicacionesMazo.mazoId, mazoId))
      .orderBy(desc(publicacionesMazo.version))
      .limit(1);
    if (!pub) throw new HTTPException(404, { message: "Mazo sin publicar" });

    return c.json(pub.paquete);
  });
