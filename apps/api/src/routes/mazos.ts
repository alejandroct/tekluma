import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { deckReleases, decks, users } from "../db/schema";
import { requiereUsuario, type AuthVars } from "../middleware/auth";

export const mazosRoutes = new Hono<AuthVars>()
  .use(requiereUsuario)

  /** Free decks download freely (the limit is the daily quota); premium decks need a subscription. */
  .get("/:id/paquete", async (c) => {
    const deckId = c.req.param("id");
    const [mazo] = await db.select({ access: decks.access }).from(decks).where(eq(decks.id, deckId));
    if (!mazo) throw new HTTPException(404, { message: "Mazo no encontrado" });

    if (mazo.access === "premium") {
      const [usuario] = await db.select({ premiumUntil: users.premiumUntil }).from(users).where(eq(users.id, c.get("usuarioId")));
      if (!(usuario?.premiumUntil && usuario.premiumUntil > new Date())) throw new HTTPException(403, { message: "Mazo Premium" });
    }

    const [pub] = await db.select().from(deckReleases).where(eq(deckReleases.deckId, deckId)).orderBy(desc(deckReleases.version)).limit(1);
    if (!pub) throw new HTTPException(404, { message: "Mazo sin publicar" });

    return c.json(pub.package);
  });
