import { Hono } from "hono";
import { desc, eq, sql } from "drizzle-orm";
import type { MazoCatalogo } from "@tekluma/shared";
import { db } from "../db/client";
import { mazos, normas, publicacionesMazo } from "../db/schema";

export const catalogo = new Hono().get("/", async (c) => {
  // Última publicación de cada mazo; los mazos nunca publicados no aparecen.
  const ultima = db
    .selectDistinctOn([publicacionesMazo.mazoId], {
      mazoId: publicacionesMazo.mazoId,
      version: publicacionesMazo.version,
      totalTarjetas: publicacionesMazo.totalTarjetas,
    })
    .from(publicacionesMazo)
    .orderBy(publicacionesMazo.mazoId, desc(publicacionesMazo.version))
    .as("ultima");

  const filas = await db
    .select({
      id: mazos.id,
      slug: mazos.slug,
      titulo: mazos.titulo,
      descripcion: mazos.descripcion,
      disciplina: normas.disciplina,
      normaCodigo: normas.codigo,
      acceso: mazos.acceso,
      precioMonedas: mazos.precioMonedas,
      totalTarjetas: ultima.totalTarjetas,
      versionPublicada: ultima.version,
    })
    .from(mazos)
    .innerJoin(normas, eq(normas.id, mazos.normaId))
    .innerJoin(ultima, eq(ultima.mazoId, mazos.id))
    .orderBy(mazos.orden, sql`${mazos.titulo} asc`);

  return c.json(filas satisfies MazoCatalogo[]);
});
