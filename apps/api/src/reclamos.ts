import { desc, eq } from "drizzle-orm";
import { PLAZO_RECLAMO_DIAS_HABILES, type ReclamoEntrada } from "@tekluma/shared";
import { db } from "./db/client";
import { complaints } from "./db/schema";
import { enviarCorreo } from "./correo";
import { destacado, fichaDatos, nota, parrafo, parrafos, plantilla, rotulo, titulo, type Seccion } from "./correo-html";
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

/** Contenido de la hoja por secciones: se usa para el texto y para el HTML del correo. */
export function seccionesHoja(h: Hoja): Seccion[] {
  return [
    {
      titulo: "Proveedor",
      filas: [
        ["Razón social", PROVEEDOR.razonSocial],
        ["RUC", PROVEEDOR.ruc],
        ["Domicilio", PROVEEDOR.domicilio],
        ["Producto", "Tekluma (tekluma.app)"],
      ],
    },
    {
      titulo: "1. Identificación del consumidor",
      filas: [
        ["Nombre", h.name],
        ["Documento", `${h.documentType} ${h.documentNumber}`],
        ["Domicilio", h.address],
        ["Teléfono", h.phone],
        ["Correo", h.email],
        ...(h.isMinor ? [["Menor de edad", `Sí. Padre, madre o apoderado: ${h.guardian}`] as [string, string]] : []),
      ],
    },
    {
      titulo: "2. Identificación del bien contratado",
      filas: [
        ["Tipo", h.itemType === "producto" ? "Producto" : "Servicio"],
        ["Descripción", h.itemDescription],
        ["Monto reclamado", h.amountCents == null ? "—" : soles(h.amountCents)],
      ],
    },
    {
      titulo: "3. Detalle de la reclamación y pedido del consumidor",
      filas: [
        [
          "Tipo",
          h.kind === "reclamo"
            ? "Reclamo (disconformidad con el producto o servicio)"
            : "Queja (disconformidad no relacionada con el producto o servicio, o con la atención)",
        ],
        ["Detalle", h.detail],
        ["Pedido", h.request],
      ],
    },
  ];
}

/** Texto de la hoja: es la constancia que recibe el consumidor y la copia que guarda la empresa. */
export function textoHoja(h: Hoja) {
  return [
    `HOJA DE RECLAMACIÓN N° ${codigoHoja(h)}`,
    `Fecha: ${fechaHora(h.createdAt)} (hora de Lima)`,
    ...seccionesHoja(h).flatMap((sec) => ["", sec.titulo.toUpperCase(), ...sec.filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`)]),
  ].join("\n");
}

/** La hoja en HTML, con su número y fecha arriba. */
const htmlHoja = (h: Hoja) =>
  rotulo(`Hoja de reclamación N° ${codigoHoja(h)}`) +
  nota(`Registrada el ${fechaHora(h.createdAt)} (hora de Lima)`) +
  fichaDatos(seccionesHoja(h));

const PIE_RECLAMO = "Recibes este correo porque registraste una hoja en el Libro de Reclamaciones de Tekluma.";

/** Constancia para el consumidor (al registrar y al reenviar). */
function correoConstancia(h: Hoja, intro: string, conPlazo: boolean) {
  const codigo = codigoHoja(h);
  const plazo = `Te responderemos a este correo en un plazo máximo de ${PLAZO_RECLAMO_DIAS_HABILES} días hábiles (a más tardar el ${fechaCorta(h.dueAt)}).`;
  return {
    asunto: `Constancia de tu ${h.kind} N° ${codigo} · Tekluma`,
    texto: [`Hola, ${h.name}:`, "", intro, ...(conPlazo ? [plazo] : []), "", textoHoja(h), "", AVISO].join("\n"),
    html: plantilla({
      previa: `${intro} N° ${codigo}.`,
      cuerpo:
        titulo(`Recibimos tu ${h.kind}`) +
        parrafo(`Hola, ${h.name}:`) +
        parrafo(intro) +
        (conPlazo
          ? destacado(
              `Te responderemos a este correo en un plazo máximo de <strong>${PLAZO_RECLAMO_DIAS_HABILES} días hábiles</strong>, a más tardar el <strong>${fechaCorta(h.dueAt)}</strong>.`,
            )
          : "") +
        htmlHoja(h) +
        `<div style="height:20px"></div>` +
        nota(AVISO),
      pie: PIE_RECLAMO,
    }),
  };
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
    const c = correoConstancia(hoja, `Registramos tu ${hoja.kind} en nuestro Libro de Reclamaciones virtual. Esta es tu constancia.`, true);
    await enviarCorreo(hoja.email, c.asunto, c.texto, { responderA: BUZON, html: c.html });
    await db.update(complaints).set({ receiptSentAt: new Date() }).where(eq(complaints.id, hoja.id));
  } catch (error) {
    console.error("Libro de reclamaciones: no se pudo enviar la constancia", codigo, error);
  }
  try {
    await enviarCorreo(
      BUZON,
      `[Libro de Reclamaciones] ${hoja.kind === "reclamo" ? "Reclamo" : "Queja"} N° ${codigo} · vence ${fechaCorta(hoja.dueAt)}`,
      `${hojaTexto}\n\nResponde desde el panel (Reclamos) antes del ${fechaCorta(hoja.dueAt)}.`,
      {
        responderA: hoja.email,
        html: plantilla({
          previa: `${hoja.name} · vence el ${fechaCorta(hoja.dueAt)}`,
          cuerpo:
            titulo(`Nuevo ${hoja.kind} en el Libro de Reclamaciones`) +
            destacado(
              `Respóndelo desde el panel (<a href="${process.env.ADMIN_URL ?? ""}" style="color:#0F1B2D;">Reclamos</a>) antes del <strong>${fechaCorta(hoja.dueAt)}</strong>.`,
            ) +
            htmlHoja(hoja),
          pie: "Copia interna del Libro de Reclamaciones de Tekluma.",
        }),
      },
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
    {
      responderA: BUZON,
      html: plantilla({
        previa: `Respuesta a tu ${hoja.kind} N° ${codigo}`,
        cuerpo:
          rotulo(`Hoja de reclamación N° ${codigo}`) +
          titulo(`Respuesta a tu ${hoja.kind}`) +
          parrafo(`Hola, ${hoja.name}:`) +
          parrafos(respuesta) +
          nota(`${PROVEEDOR.razonSocial} · RUC ${PROVEEDOR.ruc}`) +
          `<div style="height:12px"></div>` +
          nota(AVISO),
        pie: PIE_RECLAMO,
      }),
    },
  );
  await db
    .update(complaints)
    .set({ status: "respondido", response: respuesta, respondedAt: new Date(), respondedBy: usuarioId })
    .where(eq(complaints.id, id));
}

/** Reenvía la constancia (cuando SES falló al registrar). */
export async function reenviarConstancia(id: string) {
  const hoja = await hojaPorId(id);
  const c = correoConstancia(hoja, `Esta es la constancia de tu ${hoja.kind}.`, false);
  await enviarCorreo(hoja.email, c.asunto, c.texto, { responderA: BUZON, html: c.html });
  await db.update(complaints).set({ receiptSentAt: new Date() }).where(eq(complaints.id, id));
}
