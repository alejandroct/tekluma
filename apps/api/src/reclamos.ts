import { desc, eq } from "drizzle-orm";
import { PLAZO_RECLAMO_DIAS_HABILES, type ReclamoEntrada } from "@tekluma/shared";
import { db } from "./db/client";
import { complaints } from "./db/schema";
import { enviarCorreo } from "./correo";
import { fechaLima } from "./cupo";

/** Datos del proveedor que la hoja de reclamación debe mostrar. */
const PROVEEDOR = {
  razonSocial: "DCC INGENIERIA Y CONSTRUCCION S.A.C.",
  ruc: "20612731951",
  domicilio: "Mz. B1 Lote 12, Urb. Bello Horizonte Etapa Uno, Piura, Perú",
};
/** Buzón que recibe la copia de cada hoja y desde el que se responde. */
const BUZON = process.env.CORREO_RECLAMOS ?? "hola@tekluma.app";

export class ReclamoError extends Error {
  constructor(
    readonly status: 404 | 409,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/**
 * Último día del plazo: N días hábiles (lunes a viernes) después de la fecha de Lima.
 * No descuenta feriados, así que el plazo calculado nunca es más largo que el legal.
 */
export function vencimiento(desde = new Date(), dias = PLAZO_RECLAMO_DIAS_HABILES) {
  const fecha = new Date(`${fechaLima(desde)}T00:00:00Z`);
  for (let quedan = dias; quedan > 0; ) {
    fecha.setUTCDate(fecha.getUTCDate() + 1);
    const dia = fecha.getUTCDay();
    if (dia !== 0 && dia !== 6) quedan--;
  }
  // Fin de ese día en Lima (UTC−5, sin horario de verano).
  return new Date(fecha.getTime() + (24 + 5) * 3600_000 - 1000);
}

type Hoja = typeof complaints.$inferSelect;

export const codigoHoja = (h: Pick<Hoja, "number" | "createdAt">) =>
  `${String(h.number).padStart(6, "0")}-${fechaLima(h.createdAt).slice(0, 4)}`;

const fechaHora = (d: Date) =>
  new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" }).format(d);
const fechaCorta = (d: Date) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "short" }).format(d);
const soles = (centimos: number) => `S/ ${(centimos / 100).toFixed(2)}`;

/** Texto de la hoja: es la constancia que recibe el consumidor y la copia que guarda la empresa. */
export function textoHoja(h: Hoja) {
  return [
    `HOJA DE RECLAMACIÓN N° ${codigoHoja(h)}`,
    `Fecha: ${fechaHora(h.createdAt)} (hora de Lima)`,
    "",
    `Proveedor: ${PROVEEDOR.razonSocial} · RUC ${PROVEEDOR.ruc}`,
    `Domicilio: ${PROVEEDOR.domicilio}`,
    "Producto: Tekluma (tekluma.app)",
    "",
    "1. IDENTIFICACIÓN DEL CONSUMIDOR",
    `Nombre: ${h.name}`,
    `Documento: ${h.documentType} ${h.documentNumber}`,
    `Domicilio: ${h.address}`,
    `Teléfono: ${h.phone}`,
    `Correo: ${h.email}`,
    ...(h.isMinor ? [`Menor de edad. Padre, madre o apoderado: ${h.guardian}`] : []),
    "",
    "2. IDENTIFICACIÓN DEL BIEN CONTRATADO",
    `Tipo: ${h.itemType === "producto" ? "Producto" : "Servicio"}`,
    `Descripción: ${h.itemDescription}`,
    `Monto reclamado: ${h.amountCents == null ? "—" : soles(h.amountCents)}`,
    "",
    "3. DETALLE DE LA RECLAMACIÓN Y PEDIDO DEL CONSUMIDOR",
    `Tipo: ${h.kind === "reclamo" ? "Reclamo (disconformidad con el producto o servicio)" : "Queja (disconformidad no relacionada con el producto o servicio, o con la atención)"}`,
    `Detalle: ${h.detail}`,
    `Pedido: ${h.request}`,
  ].join("\n");
}

const AVISO =
  "La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo " +
  "para interponer una denuncia ante el INDECOPI.";

export async function registrarReclamo(e: ReclamoEntrada) {
  const creado = new Date();
  const [hoja] = await db
    .insert(complaints)
    .values({
      kind: e.tipo,
      name: e.nombre,
      documentType: e.tipoDocumento,
      documentNumber: e.numeroDocumento,
      address: e.domicilio,
      phone: e.telefono,
      email: e.email,
      isMinor: e.menorDeEdad,
      guardian: e.menorDeEdad ? e.apoderado : null,
      itemType: e.bien,
      itemDescription: e.descripcionBien,
      amountCents: e.montoReclamado == null ? null : Math.round(e.montoReclamado * 100),
      detail: e.detalle,
      request: e.pedido,
      dueAt: vencimiento(creado),
      createdAt: creado,
    })
    .returning();
  if (!hoja) throw new Error("No se pudo registrar el reclamo");

  const codigo = codigoHoja(hoja);
  const hojaTexto = textoHoja(hoja);
  // La hoja ya quedó guardada: si SES falla, se ve en el panel (sin constancia) y se reenvía desde ahí.
  try {
    await enviarCorreo(
      hoja.email,
      `Constancia de tu ${hoja.kind} N° ${codigo} · Tekluma`,
      [
        `Hola, ${hoja.name}:`,
        "",
        `Registramos tu ${hoja.kind} en nuestro Libro de Reclamaciones virtual. Esta es tu constancia.`,
        `Te responderemos a este correo en un plazo máximo de ${PLAZO_RECLAMO_DIAS_HABILES} días hábiles (a más tardar el ${fechaCorta(hoja.dueAt)}).`,
        "",
        hojaTexto,
        "",
        AVISO,
      ].join("\n"),
      { responderA: BUZON },
    );
    await db.update(complaints).set({ receiptSentAt: new Date() }).where(eq(complaints.id, hoja.id));
  } catch (error) {
    console.error("Libro de reclamaciones: no se pudo enviar la constancia", codigo, error);
  }
  try {
    await enviarCorreo(
      BUZON,
      `[Libro de Reclamaciones] ${hoja.kind === "reclamo" ? "Reclamo" : "Queja"} N° ${codigo} · vence ${fechaCorta(hoja.dueAt)}`,
      `${hojaTexto}\n\nResponde desde el panel (Reclamos) antes del ${fechaCorta(hoja.dueAt)}.`,
      { responderA: hoja.email },
    );
  } catch (error) {
    console.error("Libro de reclamaciones: no se pudo enviar la copia a la empresa", codigo, error);
  }

  return { codigo, fecha: hoja.createdAt.toISOString(), vence: hoja.dueAt.toISOString(), hoja: hojaTexto };
}

export const listarReclamos = () => db.select().from(complaints).orderBy(desc(complaints.number));

async function hojaPorId(id: string) {
  const [hoja] = await db.select().from(complaints).where(eq(complaints.id, id));
  if (!hoja) throw new ReclamoError(404, "Reclamo no encontrado");
  return hoja;
}

/** Envía la respuesta al consumidor y cierra la hoja. */
export async function responderReclamo(id: string, respuesta: string, usuarioId: string) {
  const hoja = await hojaPorId(id);
  if (hoja.status === "respondido") throw new ReclamoError(409, "Este reclamo ya fue respondido");
  const codigo = codigoHoja(hoja);
  await enviarCorreo(
    hoja.email,
    `Respuesta a tu ${hoja.kind} N° ${codigo} · Tekluma`,
    [`Hola, ${hoja.name}:`, "", respuesta, "", "—", `${PROVEEDOR.razonSocial} · RUC ${PROVEEDOR.ruc}`, "", `Hoja de reclamación N° ${codigo}`, AVISO].join(
      "\n",
    ),
    { responderA: BUZON },
  );
  await db
    .update(complaints)
    .set({ status: "respondido", response: respuesta, respondedAt: new Date(), respondedBy: usuarioId })
    .where(eq(complaints.id, id));
}

/** Reenvía la constancia (cuando SES falló al registrar). */
export async function reenviarConstancia(id: string) {
  const hoja = await hojaPorId(id);
  await enviarCorreo(
    hoja.email,
    `Constancia de tu ${hoja.kind} N° ${codigoHoja(hoja)} · Tekluma`,
    [`Hola, ${hoja.name}:`, "", `Esta es la constancia de tu ${hoja.kind}.`, "", textoHoja(hoja), "", AVISO].join("\n"),
    { responderA: BUZON },
  );
  await db.update(complaints).set({ receiptSentAt: new Date() }).where(eq(complaints.id, id));
}
