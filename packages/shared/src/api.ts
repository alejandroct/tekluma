import { z } from "zod";
import { DECK_ACCESS, DISCIPLINES } from "./enums";

/** Mazo en el catálogo que ve la app. */
export const mazoCatalogoSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  disciplina: z.enum(DISCIPLINES),
  normaCodigo: z.string(),
  acceso: z.enum(DECK_ACCESS),
  totalTarjetas: z.number().int().nonnegative(),
  versionPublicada: z.number().int().positive(),
});
export type MazoCatalogo = z.infer<typeof mazoCatalogoSchema>;

/** Estado FSRS de una tarjeta para un usuario (se sincroniza desde la app). */
export const estadoRepasoSchema = z.object({
  tarjetaId: z.uuid(),
  vence: z.iso.datetime(),
  estabilidad: z.number(),
  dificultad: z.number(),
  repeticiones: z.number().int(),
  fallos: z.number().int(),
  estado: z.number().int().min(0).max(3), // 0 nuevo, 1 aprendiendo, 2 repaso, 3 reaprendiendo
  ultimoRepaso: z.iso.datetime().nullable(),
});
export type EstadoRepaso = z.infer<typeof estadoRepasoSchema>;

export const sincronizarRepasosSchema = z.object({
  estados: z.array(estadoRepasoSchema).max(500),
});

/**
 * Reglas del cupo diario. Viven en el servidor (variables de entorno) para
 * ajustarlas sin publicar una versión nueva de la app.
 */
export const reglasCupoSchema = z.object({
  cupoGratis: z.number().int().positive(),
  /** Cupo mayor durante los primeros días, para formar el hábito. */
  cupoBienvenida: z.number().int().positive(),
  diasBienvenida: z.number().int().nonnegative(),
  tarjetasPorAnuncio: z.number().int().positive(),
  maxAnunciosDia: z.number().int().nonnegative(),
  maxIntersticialesDia: z.number().int().nonnegative(),
  /** Monedas que cuesta (y tarjetas que da) cada ampliación con monedas: 1 moneda = 1 tarjeta. */
  tarjetasPorCompraMonedas: z.number().int().positive(),
  /** Anuncios para ganar monedas (contador separado de los anuncios por tarjetas). */
  monedasPorAnuncio: z.number().int().positive(),
  maxAnunciosMonedasDia: z.number().int().nonnegative(),
  /** Recompensa del check-in según el día de la racha (se repite tras el último). */
  checkIn: z.array(z.number().int().positive()).min(1),
});
export type ReglasCupo = z.infer<typeof reglasCupoSchema>;

/** Estado del día del usuario (fecha en hora de Lima). */
export const estadoCupoSchema = z.object({
  fecha: z.iso.date(),
  premium: z.boolean(),
  limite: z.number().int(),
  usadas: z.number().int(),
  restantes: z.number().int(),
  anunciosVistos: z.number().int(),
  monedas: z.number().int(),
  reglas: reglasCupoSchema,
});
export type EstadoCupo = z.infer<typeof estadoCupoSchema>;

/** Pantalla de recompensas: check-in diario con racha y anuncios para ganar monedas. */
export const estadoRecompensasSchema = z.object({
  fecha: z.iso.date(),
  monedas: z.number().int(),
  checkIn: z.object({
    hechoHoy: z.boolean(),
    /** Días seguidos con check-in, contando hoy si ya se hizo. */
    racha: z.number().int(),
    /** Monedas que da el check-in de hoy (o el de mañana, si hoy ya se hizo). */
    proxima: z.number().int(),
  }),
  anunciosMonedasVistos: z.number().int(),
  reglas: reglasCupoSchema,
});
export type EstadoRecompensas = z.infer<typeof estadoRecompensasSchema>;

export const consumirTarjetaSchema = z.object({ tarjetaId: z.uuid() });

/** Pregunta del día: la misma para todos, numerada como el Wordle (#1 = 1 nov 2026). */
export const solucionDiariaSchema = z.object({
  correcta: z.number().int(),
  explicacion: z.string().optional(),
  cita: z.object({ articulo: z.string(), extracto: z.string() }).optional(),
});
export type SolucionDiaria = z.infer<typeof solucionDiariaSchema>;

export const estadoDiariaSchema = z.object({
  /** Opciones elegidas en orden (índices). */
  intentos: z.array(z.number().int()),
  resuelta: z.boolean(),
  terminada: z.boolean(),
  /** Solo cuando terminó (acertó o agotó intentos). */
  solucion: solucionDiariaSchema.optional(),
  /** Días seguidos jugando; solo con sesión. */
  racha: z.number().int().optional(),
  /** Monedas ganadas al resolverla; solo con sesión. */
  monedas: z.number().int().optional(),
});
export type EstadoDiaria = z.infer<typeof estadoDiariaSchema>;

export const preguntaDiariaSchema = z.object({
  numero: z.number().int().positive(),
  fecha: z.iso.date(),
  norma: z.string(),
  pregunta: z.string(),
  opciones: z.array(z.string()),
  intentosMax: z.number().int().positive(),
  /** Monedas por acertar al 1.er, 2.º y 3.er intento. */
  premios: z.array(z.number().int()),
  estado: estadoDiariaSchema,
});
export type PreguntaDiaria = z.infer<typeof preguntaDiariaSchema>;

export const intentoDiariaSchema = z.object({
  numero: z.number().int().positive(),
  opcion: z.number().int().nonnegative(),
  /** Sin sesión (web): intentos previos que lleva el navegador. */
  previas: z.array(z.number().int().nonnegative()).max(5).default([]),
});
