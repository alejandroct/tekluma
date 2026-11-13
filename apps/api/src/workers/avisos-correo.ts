import { conSentry } from "../sentry";
import type { SNSHandler } from "aws-lambda";
import { enviarCorreo } from "../correo";

/** Event published by SES through the configuration set (only bounces and complaints reach here). */
type EventoSes = {
  eventType: "Bounce" | "Complaint";
  mail: { timestamp: string; destination: string[]; commonHeaders?: { subject?: string } };
  bounce?: {
    bounceType: "Permanent" | "Transient" | "Undetermined";
    bounceSubType: string;
    bouncedRecipients: { emailAddress: string; diagnosticCode?: string }[];
  };
  complaint?: { complainedRecipients: { emailAddress: string }[]; complaintFeedbackType?: string };
};

const DESTINO = process.env.CORREO_AVISOS ?? "hola@tekluma.app";

/** Turns each SES bounce or complaint into a readable email: AWS suspends accounts with high rates. */
export const handler: SNSHandler = conSentry(async (evento) => {
  for (const registro of evento.Records) {
    const e = JSON.parse(registro.Sns.Message) as EventoSes;
    const asuntoOriginal = e.mail.commonHeaders?.subject ?? "(sin asunto)";
    let asunto: string;
    let detalle: string[];
    if (e.eventType === "Bounce" && e.bounce) {
      const permanente = e.bounce.bounceType === "Permanent";
      asunto = `[Correo] Rebote ${permanente ? "permanente" : "temporal"}: ${e.bounce.bouncedRecipients.map((r) => r.emailAddress).join(", ")}`;
      detalle = [
        permanente
          ? "La dirección no existe o rechaza el correo. SES ya no le enviará más (lista de supresión de la cuenta)."
          : "Falla pasajera (buzón lleno, servidor caído). SES puede volver a intentarlo.",
        `Tipo: ${e.bounce.bounceType} / ${e.bounce.bounceSubType}`,
        ...e.bounce.bouncedRecipients.map((r) => `Destinatario: ${r.emailAddress}${r.diagnosticCode ? ` — ${r.diagnosticCode}` : ""}`),
      ];
    } else if (e.eventType === "Complaint" && e.complaint) {
      asunto = `[Correo] Queja de spam: ${e.complaint.complainedRecipients.map((r) => r.emailAddress).join(", ")}`;
      detalle = [
        "La persona marcó nuestro correo como spam. SES ya no le enviará más (lista de supresión de la cuenta).",
        `Tipo de queja: ${e.complaint.complaintFeedbackType ?? "no indicado"}`,
      ];
    } else {
      continue;
    }
    console.log(asunto);
    await enviarCorreo(
      DESTINO,
      asunto,
      [...detalle, "", `Correo original: «${asuntoOriginal}»`, `Enviado: ${e.mail.timestamp}`, `Destino: ${e.mail.destination.join(", ")}`].join("\n"),
    );
  }
});
