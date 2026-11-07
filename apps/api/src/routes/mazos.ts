import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { desbloqueosMazo, mazos, movimientosMonedas, publicacionesMazo, usuarios } from "../db/schema";
import { requiereUsuario, type AuthVars } from "../middleware/auth";

async function tieneAcceso(usuarioId: string, mazoId: string) {
  const [mazo] = await db.select().from(mazos).where(eq(mazos.id, mazoId));
  if (!mazo) throw new HTTPException(404, { message: "Mazo no encontrado" });
  if (mazo.acceso === "gratis") return { mazo, acceso: true };

  const [usuario] = await db
    .select({ premiumHasta: usuarios.premiumHasta })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId));
  if (usuario?.premiumHasta && usuario.premiumHasta > new Date()) return { mazo, acceso: true };

  const [desbloqueo] = await db
    .select()
    .from(desbloqueosMazo)
    .where(and(eq(desbloqueosMazo.usuarioId, usuarioId), eq(desbloqueosMazo.mazoId, mazoId)));
  return { mazo, acceso: Boolean(desbloqueo) };
}

export const mazosRoutes = new Hono<AuthVars>()
  .use(requiereUsuario)

  .get("/:id/paquete", async (c) => {
    const mazoId = c.req.param("id");
    const { acceso } = await tieneAcceso(c.get("usuarioId"), mazoId);
    if (!acceso) throw new HTTPException(403, { message: "Mazo bloqueado" });

    const [pub] = await db
      .select()
      .from(publicacionesMazo)
      .where(eq(publicacionesMazo.mazoId, mazoId))
      .orderBy(desc(publicacionesMazo.version))
      .limit(1);
    if (!pub) throw new HTTPException(404, { message: "Mazo sin publicar" });

    // TODO: devolver URL firmada de CloudFront cuando SST esté desplegado.
    return c.json({ version: pub.version, clave: pub.claveS3 });
  })

  .post("/:id/desbloquear", async (c) => {
    const usuarioId = c.get("usuarioId");
    const mazoId = c.req.param("id");
    const { mazo, acceso } = await tieneAcceso(usuarioId, mazoId);
    if (acceso) return c.json({ desbloqueado: true });
    if (mazo.acceso !== "monedas" || mazo.precioMonedas == null) {
      throw new HTTPException(403, { message: "Este mazo requiere suscripción" });
    }
    const precio = mazo.precioMonedas;

    const resultado = await db.transaction(async (tx) => {
      // Serializa los gastos del usuario para que dos desbloqueos simultáneos no dejen saldo negativo.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${usuarioId}))`);
      const [{ saldo } = { saldo: 0 }] = await tx
        .select({ saldo: sql<number>`coalesce(sum(${movimientosMonedas.cantidad}), 0)::int` })
        .from(movimientosMonedas)
        .where(eq(movimientosMonedas.usuarioId, usuarioId));
      if (saldo < precio) return { ok: false as const, saldo };

      await tx.insert(movimientosMonedas).values({
        usuarioId,
        cantidad: -precio,
        motivo: "desbloqueo",
        referencia: `${usuarioId}:${mazoId}`,
      });
      await tx.insert(desbloqueosMazo).values({ usuarioId, mazoId });
      return { ok: true as const, saldo: saldo - precio };
    });

    if (!resultado.ok) {
      return c.json({ desbloqueado: false, motivo: "saldo_insuficiente", saldo: resultado.saldo }, 402);
    }
    return c.json({ desbloqueado: true, saldo: resultado.saldo });
  });
