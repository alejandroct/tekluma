import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

let ses: SESv2Client | null = null;

/** En local, el HTML queda en .correos/ para abrirlo en el navegador. */
async function guardarVistaPrevia(asunto: string, html: string) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const archivo = `.correos/${Date.now()}-${asunto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").slice(0, 60)}.html`;
  await mkdir(".correos", { recursive: true });
  await writeFile(archivo, html);
  console.log(`   Vista previa: ${archivo}\n`);
}

/**
 * Envía un correo con Amazon SES (en AWS, con el permiso del rol de la Lambda: sin claves).
 * Sin CORREO_PROVEEDOR=ses (desarrollo local) solo lo imprime. Fuera de producción también
 * se imprime en los logs, para poder probar aunque SES siga en sandbox.
 * `html` es opcional (ver correo-html.ts); el texto plano siempre se envía.
 */
export async function enviarCorreo(para: string, asunto: string, texto: string, opciones: { responderA?: string; html?: string } = {}) {
  if (process.env.NODE_ENV !== "production") console.log(`\n📧 Para: ${para}\n   ${asunto}\n   ${texto}\n`);
  if (process.env.CORREO_PROVEEDOR !== "ses") {
    if (opciones.html) await guardarVistaPrevia(asunto, opciones.html);
    return;
  }

  ses ??= new SESv2Client({});
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: process.env.CORREO_REMITENTE,
      Destination: { ToAddresses: [para] },
      ...(opciones.responderA ? { ReplyToAddresses: [opciones.responderA] } : {}),
      Content: {
        Simple: {
          Subject: { Data: asunto, Charset: "UTF-8" },
          // Con HTML va también el texto: lo usan los clientes sin HTML y los filtros de spam.
          Body: { Text: { Data: texto, Charset: "UTF-8" }, ...(opciones.html ? { Html: { Data: opciones.html, Charset: "UTF-8" } } : {}) },
        },
      },
    }),
  );
}
