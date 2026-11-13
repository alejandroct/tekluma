import { z } from "zod";

/**
 * Simulacro de examen: preguntas de opción múltiple al azar, con tiempo límite y nota vigesimal.
 * El plan gratuito tiene un simulacro corto por semana; Premium, ilimitados y de cualquier largo.
 */
export const SIMULACRO = {
  largos: [20, 40] as const,
  segundosPorPregunta: 90,
  gratisPorSemana: 1,
  largoGratis: 20,
} as const;

export const crearSimulacroSchema = z.object({
  norma: z.string().max(20),
  preguntas: z.union([z.literal(20), z.literal(40)]),
  /** Solo estos mazos (capítulos); vacío o ausente = toda la norma. */
  mazos: z.array(z.uuid()).max(40).optional(),
});

export const entregarSimulacroSchema = z.object({
  /** Índice elegido por pregunta, en orden; null si quedó sin responder. */
  respuestas: z.array(z.number().int().min(0).max(9).nullable()).max(40),
});

export type MazoSimulacro = { id: string; titulo: string; preguntas: number };
export type NormaSimulacro = { codigo: string; titulo: string; mazos: MazoSimulacro[]; preguntas: number };

export type ResumenSimulacro = {
  id: string;
  norma: string;
  total: number;
  aciertos: number | null;
  nota: number | null;
  creadoEn: string;
  entregado: boolean;
};

export type OpcionesSimulacro = {
  normas: NormaSimulacro[];
  premium: boolean;
  /** Simulacros gratis que quedan esta semana (null con Premium). */
  gratisRestantes: number | null;
  /** Uno empezado y aún dentro del tiempo, para continuarlo. */
  enCurso: ResumenSimulacro | null;
  historial: ResumenSimulacro[];
};

export type PreguntaSimulacro = { id: string; pregunta: string; imagenUrl?: string; opciones: string[]; mazo: string };

export type Simulacro = {
  id: string;
  norma: string;
  /** Momento de inicio (ISO) y tiempo total: el reloj es el del servidor. */
  iniciado: string;
  limiteSegundos: number;
  preguntas: PreguntaSimulacro[];
  /** Si ya se entregó, el resultado. */
  resultado?: ResultadoSimulacro;
};

export type ResultadoSimulacro = {
  total: number;
  aciertos: number;
  /** Nota sobre 20, redondeada como en el colegio y la universidad peruanos. */
  nota: number;
  segundos: number;
  porMazo: { mazo: string; aciertos: number; total: number }[];
  solucion: {
    id: string;
    correcta: number;
    elegida: number | null;
    explicacion?: string;
    citas: { articulo: string; extracto: string }[];
  }[];
};

/** 0–20 redondeado al entero, como las actas de notas. */
export const notaVigesimal = (aciertos: number, total: number) => (total ? Math.round((aciertos / total) * 20) : 0);
