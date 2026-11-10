import { z } from "zod";
import { contenidoTarjetaSchema, citaSchema } from "./tarjetas";

/**
 * Paquete de un mazo tal como lo descarga la app desde S3/CloudFront.
 * Se genera al publicar una versión del mazo; es inmutable.
 */
export const paqueteMazoSchema = z.object({
  mazoId: z.uuid(),
  version: z.number().int().positive(),
  publicadoEn: z.iso.datetime(),
  norma: z.object({ codigo: z.string(), titulo: z.string(), version: z.string() }),
  tarjetas: z.array(
    z.object({
      id: z.uuid(),
      revision: z.number().int().positive(),
      contenido: contenidoTarjetaSchema,
      /** `pagina`: página del documento oficial donde está el artículo, para consultarlo en la fuente. */
      citas: z.array(citaSchema.extend({ articulo: z.string(), pagina: z.number().int().positive().optional() })),
    }),
  ),
});
export type PaqueteMazo = z.infer<typeof paqueteMazoSchema>;
