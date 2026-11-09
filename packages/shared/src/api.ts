import { z } from "zod";
import { ACCESOS_MAZO, DISCIPLINAS } from "./enums";

/** Mazo en el catálogo que ve la app. */
export const mazoCatalogoSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  disciplina: z.enum(DISCIPLINAS),
  normaCodigo: z.string(),
  acceso: z.enum(ACCESOS_MAZO),
  precioMonedas: z.number().int().nonnegative().nullable(),
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

export const accesosSchema = z.object({
  premium: z.boolean(),
  desbloqueados: z.array(z.uuid()),
});
export type Accesos = z.infer<typeof accesosSchema>;
