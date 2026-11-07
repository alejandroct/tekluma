import { z } from "zod";

/** Cita normativa que respalda la tarjeta; se muestra al usuario al final. */
export const citaSchema = z.object({
  articuloId: z.uuid(),
  /** Texto literal (o extracto) del artículo citado. */
  extracto: z.string().min(1),
});

const base = {
  explicacion: z.string().optional(),
  imagenUrl: z.url().optional(),
};

export const tarjetaConceptoSchema = z.object({
  tipo: z.literal("concepto"),
  pregunta: z.string().min(1),
  respuesta: z.string().min(1),
  ...base,
});

export const tarjetaOpcionMultipleSchema = z.object({
  tipo: z.literal("opcion_multiple"),
  pregunta: z.string().min(1),
  opciones: z.array(z.string().min(1)).min(2).max(6),
  correcta: z.number().int().nonnegative(),
  ...base,
});

/** Texto con huecos marcados como {{respuesta}}. */
export const tarjetaCompletarSchema = z.object({
  tipo: z.literal("completar"),
  texto: z.string().regex(/\{\{.+?\}\}/, "Debe tener al menos un hueco {{...}}"),
  ...base,
});

/** Lectura de una tabla normativa: se pide una celda dada la fila y columna. */
export const tarjetaTablaSchema = z.object({
  tipo: z.literal("tabla"),
  titulo: z.string().min(1),
  columnas: z.array(z.string()).min(1),
  filas: z.array(z.object({ etiqueta: z.string(), valores: z.array(z.string()) })).min(1),
  pregunta: z.object({ fila: z.number().int(), columna: z.number().int() }),
  ...base,
});

/**
 * Mini caso numérico con valores aleatorios en cada repaso.
 * Ej. E.030: V = Z·U·C·S / R · P
 */
export const tarjetaCasoNumericoSchema = z.object({
  tipo: z.literal("caso_numerico"),
  enunciado: z.string().min(1), // usa {Z}, {U}... para interpolar
  variables: z.record(
    z.string(),
    z.object({
      etiqueta: z.string(),
      valores: z.array(z.number()).min(1),
      unidad: z.string().optional(),
    }),
  ),
  /** Expresión aritmética con los nombres de las variables. */
  formula: z.string().min(1),
  unidadResultado: z.string().optional(),
  /** Tolerancia relativa aceptada (0.02 = 2%). */
  tolerancia: z.number().positive().max(0.2).default(0.02),
  ...base,
});

export const tarjetaImagenSchema = z.object({
  tipo: z.literal("imagen"),
  pregunta: z.string().min(1),
  imagenUrl: z.url(),
  respuesta: z.string().min(1),
  explicacion: z.string().optional(),
});

export const contenidoTarjetaSchema = z.discriminatedUnion("tipo", [
  tarjetaConceptoSchema,
  tarjetaOpcionMultipleSchema,
  tarjetaCompletarSchema,
  tarjetaTablaSchema,
  tarjetaCasoNumericoSchema,
  tarjetaImagenSchema,
]);
export type ContenidoTarjeta = z.infer<typeof contenidoTarjetaSchema>;
export type TipoTarjeta = ContenidoTarjeta["tipo"];
