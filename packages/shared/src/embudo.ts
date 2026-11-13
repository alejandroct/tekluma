import { z } from "zod";

/**
 * Pasos del embudo que solo la app conoce (antes de tener cuenta, o pantallas que el servidor no ve).
 * El resto (registro, perfil, primera tarjeta, vuelta al día siguiente, compra) lo deduce la API.
 */
export const EVENTOS_EMBUDO = ["primera_apertura", "tutorial_visto", "codigo_pedido", "sesion_iniciada", "premium_visto"] as const;
export type EventoEmbudo = (typeof EVENTOS_EMBUDO)[number];

export const eventoEmbudoSchema = z.object({
  /** Id aleatorio de la instalación, generado en el dispositivo (no es el IDFA ni el de Android). */
  instalacion: z.uuid(),
  evento: z.enum(EVENTOS_EMBUDO),
  plataforma: z.enum(["ios", "android"]),
});
