import { z } from "zod";
import { DECK_ACCESS, DISCIPLINES } from "./enums";
import { contenidoTarjetaSchema } from "./tarjetas";

/**
 * Archivo de importación masiva desde el panel editorial (un archivo por capítulo de norma).
 *
 * - `articulos`: texto literal de la norma con su página en el documento oficial. Se crean o
 *   actualizan por número; nunca se pierde la fuente.
 * - `mazos`: se crean o amplían por `slug`. Las tarjetas entran «en revisión» (o como borrador):
 *   pasan por el flujo editorial igual que las escritas a mano y no se publican solas.
 * - Las figuras van como `imagenUrl` con una imagen embebida (`data:image/jpeg;base64,…`): viajan
 *   dentro del paquete del mazo y se cifran con él en el dispositivo.
 */
export const FORMATO_IMPORTACION = "tekluma-mazos/1";

export const articuloImportadoSchema = z.object({
  numero: z.string().min(1),
  epigrafe: z.string().optional(),
  texto: z.string().min(1),
  pagina: z.number().int().positive().optional(),
});

export const tarjetaImportadaSchema = z.object({
  contenido: contenidoTarjetaSchema,
  /** Cada tarjeta cita al menos un artículo (del archivo o ya cargado) con un extracto literal. */
  citas: z.array(z.object({ articulo: z.string().min(1), extracto: z.string().min(1) })).min(1),
});

export const mazoImportadoSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  titulo: z.string().min(1),
  descripcion: z.string().default(""),
  acceso: z.enum(DECK_ACCESS).default("free"),
  orden: z.number().int().optional(),
  tarjetas: z.array(tarjetaImportadaSchema).min(1),
});

export const importacionSchema = z.object({
  formato: z.literal(FORMATO_IMPORTACION),
  norma: z.object({
    codigo: z.string().min(1),
    titulo: z.string().min(1),
    disciplina: z.enum(DISCIPLINES),
    dispositivo: z.string().min(1),
    publicadaEn: z.iso.date(),
  }),
  /** Documento del que se extrajo (nombre del PDF oficial), para trazabilidad. */
  fuente: z.string().optional(),
  articulos: z.array(articuloImportadoSchema).default([]),
  mazos: z.array(mazoImportadoSchema).default([]),
});
export type Importacion = z.infer<typeof importacionSchema>;

export type ResultadoImportacion = {
  norma: string;
  articulos: { creados: number; actualizados: number };
  mazos: { slug: string; creado: boolean; tarjetasNuevas: number; repetidas: number }[];
  /** Estado con el que entraron las tarjetas nuevas. */
  estado: "in_review" | "draft" | "approved";
};
