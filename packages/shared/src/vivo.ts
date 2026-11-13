import { z } from "zod";

/**
 * Partida en vivo: un anfitrión proyecta las preguntas y el grupo responde a la vez desde su
 * teléfono (en la web, sin cuenta). Acertar da más puntos cuanto más rápido.
 */
export const VIVO = {
  preguntas: [5, 10, 15, 20] as const,
  segundos: [10, 20, 30] as const,
  maxJugadores: 60,
  puntosMax: 1000,
  puntosMin: 500,
} as const;

export const crearVivoSchema = z.object({
  norma: z.string().max(20).optional(),
  preguntas: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]).default(10),
  segundos: z.union([z.literal(10), z.literal(20), z.literal(30)]).default(20),
});
export const unirseVivoSchema = z.object({ nombre: z.string().trim().min(2).max(24) });
export const responderVivoSchema = z.object({ token: z.string().min(10).max(64), opcion: z.number().int().min(0).max(9) });
export const avanzarVivoSchema = z.object({ clave: z.string().min(10).max(64) });

export type FaseVivo = "sala" | "pregunta" | "revision" | "fin";
export type FilaVivo = { nombre: string; puntos: number; soyYo?: boolean };

export type EstadoVivo = {
  codigo: string;
  norma: string;
  fase: FaseVivo;
  /** Pregunta actual (0…total-1); -1 en la sala. */
  indice: number;
  total: number;
  segundos: number;
  /** Reloj del servidor (ms) y comienzo de la pregunta, para que todos cuenten igual. */
  ahora: number;
  inicio: number | null;
  jugadores: number;
  esAnfitrion: boolean;
  /** En la sala: quiénes ya entraron. */
  nombres?: string[];
  pregunta?: { texto: string; opciones: string[]; imagenUrl?: string };
  /** Cuántos respondieron la pregunta actual. */
  respondieron?: number;
  /** Solo al revisar: la correcta y cuántos eligieron cada opción. */
  correcta?: number;
  reparto?: number[];
  ranking?: FilaVivo[];
  yo?: { nombre: string; puntos: number; posicion: number; elegida: number | null; ganados: number | null };
};
