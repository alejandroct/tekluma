import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

let ses: SESv2Client | null = null;

/**
 * Envía un correo con Amazon SES (en AWS, con el permiso del rol de la Lambda: sin claves).
 * Sin CORREO_PROVEEDOR=ses (desarrollo local) solo lo imprime. Fuera de producción también
 * se imprime en los logs, para poder probar aunque SES siga en sandbox.
 */
export async function enviarCorreo(para: string, asunto: string, texto: string) {
  if (process.env.NODE_ENV !== "production") console.log(`\n📧 Para: ${para}\n   ${asunto}\n   ${texto}\n`);
  if (process.env.CORREO_PROVEEDOR !== "ses") return;

  ses ??= new SESv2Client({});
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: process.env.CORREO_REMITENTE,
      Destination: { ToAddresses: [para] },
      Content: {
        Simple: {
          Subject: { Data: asunto, Charset: "UTF-8" },
          Body: { Text: { Data: texto, Charset: "UTF-8" } },
        },
      },
    }),
  );
}
