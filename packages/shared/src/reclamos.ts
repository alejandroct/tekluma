import { z } from "zod";

/**
 * Libro de Reclamaciones virtual (Código de Protección y Defensa del Consumidor y su reglamento,
 * D.S. 011-2011-PCM). Reclamo: disconformidad con el producto o servicio. Queja: disconformidad
 * que no es sobre el producto o servicio, o malestar con la atención.
 */
export const TIPOS_RECLAMO = ["reclamo", "queja"] as const;
export const TIPOS_DOCUMENTO = ["DNI", "CE", "Pasaporte", "RUC"] as const;
export const TIPOS_BIEN = ["servicio", "producto"] as const;
export const ESTADOS_RECLAMO = ["pendiente", "respondido"] as const;
export type TipoReclamo = (typeof TIPOS_RECLAMO)[number];
export type EstadoReclamo = (typeof ESTADOS_RECLAMO)[number];

/** Plazo legal de respuesta (D.S. 101-2022-PCM): 15 días hábiles, improrrogable. */
export const PLAZO_RECLAMO_DIAS_HABILES = 15;

const texto = (min: number, max: number, mensaje: string) =>
  z.string().trim().min(min, mensaje).max(max, `Máximo ${max} caracteres`);

export const reclamoSchema = z
  .object({
    tipo: z.enum(TIPOS_RECLAMO),
    nombre: texto(3, 120, "Escribe tu nombre completo"),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO),
    numeroDocumento: z.string().trim().regex(/^[A-Za-z0-9-]{6,20}$/, "Revisa el número de documento"),
    domicilio: texto(5, 200, "Escribe tu domicilio"),
    telefono: z.string().trim().regex(/^[0-9 +()-]{6,20}$/, "Revisa el teléfono"),
    email: z.email("Revisa el correo").max(200),
    menorDeEdad: z.boolean().default(false),
    apoderado: z.string().trim().max(120).optional(),
    bien: z.enum(TIPOS_BIEN),
    descripcionBien: texto(3, 300, "Describe el producto o servicio"),
    /** En soles; opcional (una queja puede no tener monto). */
    montoReclamado: z.number().nonnegative().max(1_000_000).optional(),
    detalle: texto(10, 3000, "Cuéntanos qué pasó (al menos 10 caracteres)"),
    pedido: texto(5, 2000, "Indica qué solicitas"),
    conformidad: z.literal(true, { error: "Confirma que los datos son correctos" }),
    /** Trampa para bots: un campo oculto que una persona nunca llena. */
    web: z.string().max(0).optional(),
  })
  .refine((d) => !d.menorDeEdad || (d.apoderado?.length ?? 0) >= 3, {
    path: ["apoderado"],
    message: "Escribe el nombre del padre, madre o apoderado",
  });
export type ReclamoEntrada = z.infer<typeof reclamoSchema>;

export const respuestaReclamoSchema = z.object({
  respuesta: texto(10, 5000, "Escribe la respuesta (al menos 10 caracteres)"),
});
