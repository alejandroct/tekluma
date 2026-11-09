/** Envía un correo con Resend; sin RESEND_API_KEY (desarrollo) solo lo imprime. */
export async function enviarCorreo(para: string, asunto: string, texto: string) {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.log(`\n📧 Para: ${para}\n   ${asunto}\n   ${texto}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CORREO_REMITENTE ?? "Tekluma <hola@tekluma.app>",
      to: para,
      subject: asunto,
      text: texto,
    }),
  });
  if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
}
