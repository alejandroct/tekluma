import { and, desc, eq, inArray } from "drizzle-orm";
import { paqueteMazoSchema, type PaqueteMazo } from "@tekluma/shared";
import { db } from "./db/client";
import { articulos, citasTarjeta, mazos, normas, publicacionesMazo, tarjetas, versionesNorma } from "./db/schema";

/**
 * Publica una nueva versión de un mazo con sus tarjetas aprobadas (o ya publicadas).
 * El paquete resultante es inmutable: corregir una tarjeta implica publicar otra versión.
 */
export async function publicarMazo(mazoId: string, publicadoPor: string) {
  return db.transaction(async (tx) => {
    const [mazo] = await tx
      .select({ id: mazos.id, codigo: normas.codigo, titulo: normas.titulo, normaId: normas.id })
      .from(mazos)
      .innerJoin(normas, eq(normas.id, mazos.normaId))
      .where(eq(mazos.id, mazoId));
    if (!mazo) throw new Error(`Mazo ${mazoId} no existe`);

    const [vigente] = await tx
      .select({ dispositivo: versionesNorma.dispositivo })
      .from(versionesNorma)
      .where(and(eq(versionesNorma.normaId, mazo.normaId), eq(versionesNorma.vigente, true)));

    const filas = await tx
      .select()
      .from(tarjetas)
      .where(and(eq(tarjetas.mazoId, mazoId), inArray(tarjetas.estado, ["aprobado", "publicado"])))
      .orderBy(tarjetas.creadoEn);
    if (filas.length === 0) throw new Error("El mazo no tiene tarjetas aprobadas");

    const citas = await tx
      .select({
        tarjetaId: citasTarjeta.tarjetaId,
        articuloId: citasTarjeta.articuloId,
        extracto: citasTarjeta.extracto,
        articulo: articulos.numero,
      })
      .from(citasTarjeta)
      .innerJoin(articulos, eq(articulos.id, citasTarjeta.articuloId))
      .where(inArray(citasTarjeta.tarjetaId, filas.map((t) => t.id)));

    const [ultima] = await tx
      .select({ version: publicacionesMazo.version })
      .from(publicacionesMazo)
      .where(eq(publicacionesMazo.mazoId, mazoId))
      .orderBy(desc(publicacionesMazo.version))
      .limit(1);
    const version = (ultima?.version ?? 0) + 1;

    const paquete: PaqueteMazo = paqueteMazoSchema.parse({
      mazoId,
      version,
      publicadoEn: new Date().toISOString(),
      norma: { codigo: mazo.codigo, titulo: mazo.titulo, version: vigente?.dispositivo ?? "" },
      tarjetas: filas.map((t) => ({
        id: t.id,
        revision: t.revision,
        contenido: t.contenido,
        citas: citas
          .filter((c) => c.tarjetaId === t.id)
          .map(({ articuloId, extracto, articulo }) => ({ articuloId, extracto, articulo })),
      })),
    });

    await tx.insert(publicacionesMazo).values({ mazoId, version, paquete, totalTarjetas: filas.length, publicadoPor });
    await tx
      .update(tarjetas)
      .set({ estado: "publicado" })
      .where(inArray(tarjetas.id, filas.map((t) => t.id)));

    return { version, totalTarjetas: filas.length };
  });
}
