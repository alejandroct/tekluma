/**
 * HTML de los correos. Tablas y estilos en línea: es lo único que Gmail, Outlook y Apple Mail
 * muestran igual. Cada correo lleva también su versión en texto plano (ver correo.ts).
 */

const C = {
  navy: "#0F1B2D",
  pizarra: "#3B5174",
  gris: "#6A7A93",
  ambar: "#FF8A1F",
  ambarSuave: "#FFF3E8",
  papel: "#F6F5F2",
  blanco: "#FFFFFF",
  linea: "#E1E4EA",
};
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";

const WEB = process.env.WEB_URL ?? "https://tekluma.app";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texto libre (p. ej. la respuesta a un reclamo): párrafos por línea en blanco, saltos de línea como <br>. */
export const parrafos = (texto: string) =>
  texto
    .trim()
    .split(/\n\s*\n/)
    .map((p) => parrafo(p, true))
    .join("");

export const parrafo = (texto: string, conSaltos = false) =>
  `<p style="margin:0 0 16px;font:16px/1.55 ${SANS};color:${C.navy};">${conSaltos ? esc(texto).replace(/\n/g, "<br>") : esc(texto)}</p>`;

export const titulo = (texto: string) =>
  `<h1 style="margin:0 0 16px;font:700 24px/1.25 ${SANS};color:${C.navy};letter-spacing:-0.3px;">${esc(texto)}</h1>`;

/** Rótulo pequeño en mayúsculas sobre el título (como en la web y la app). */
export const rotulo = (texto: string) =>
  `<p style="margin:0 0 8px;font:700 12px/1.4 ${MONO};color:${C.ambar};letter-spacing:1.5px;text-transform:uppercase;">${esc(texto)}</p>`;

/** El código de acceso, grande y fácil de copiar. */
export const codigo = (otp: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr><td style="background:${C.papel};border:1px solid ${C.linea};border-left:4px solid ${C.ambar};border-radius:6px;padding:16px 24px;">
    <span style="font:700 34px/1 ${MONO};color:${C.navy};letter-spacing:8px;">${esc(otp)}</span>
  </td></tr>
</table>`;

/** Recuadro destacado (plazos, avisos importantes). */
export const destacado = (html: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  <tr><td style="background:${C.ambarSuave};border-left:4px solid ${C.ambar};border-radius:4px;padding:14px 16px;font:15px/1.5 ${SANS};color:${C.navy};">${html}</td></tr>
</table>`;

export const nota = (texto: string) =>
  `<p style="margin:0 0 12px;font:13px/1.5 ${SANS};color:${C.gris};">${esc(texto)}</p>`;

export type Seccion = { titulo: string; filas: [etiqueta: string, valor: string][] };

/** Datos en dos columnas agrupados por sección (la hoja de reclamación). */
export const fichaDatos = (secciones: Seccion[]) =>
  secciones
    .map(
      (s) => `
<p style="margin:24px 0 8px;font:700 11px/1.4 ${MONO};color:${C.pizarra};letter-spacing:1.2px;text-transform:uppercase;">${esc(s.titulo)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.linea};">
${s.filas
  .map(
    ([etiqueta, valor]) => `  <tr>
    <td valign="top" style="width:34%;padding:8px 12px 8px 0;border-bottom:1px solid ${C.linea};font:13px/1.45 ${SANS};color:${C.gris};">${esc(etiqueta)}</td>
    <td valign="top" style="padding:8px 0;border-bottom:1px solid ${C.linea};font:14px/1.45 ${SANS};color:${C.navy};">${esc(valor).replace(/\n/g, "<br>")}</td>
  </tr>`,
  )
  .join("\n")}
</table>`,
    )
    .join("");

/**
 * Documento completo. `previa` es el texto que el buzón muestra junto al asunto;
 * `pie` explica por qué la persona recibe el correo.
 */
export function plantilla({ previa, cuerpo, pie }: { previa: string; cuerpo: string; pie: string }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Tekluma</title>
</head>
<body style="margin:0;padding:0;background:${C.papel};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.papel};">${esc(previa)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.papel};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 20px;">
        <a href="${WEB}" style="text-decoration:none;"><img src="${WEB}/correo/logo.png" width="132" height="33" alt="Tekluma" style="display:block;border:0;width:132px;height:auto;"></a>
      </td></tr>
      <tr><td style="background:${C.blanco};border:1px solid ${C.linea};border-top:4px solid ${C.navy};border-radius:8px;padding:32px 28px 20px;">
        ${cuerpo}
      </td></tr>
      <tr><td style="padding:20px 4px 0;font:12px/1.6 ${SANS};color:${C.gris};">
        ${esc(pie)}<br>
        Tekluma · DCC INGENIERIA Y CONSTRUCCION S.A.C. · RUC 20612731951<br>
        <a href="${WEB}" style="color:${C.pizarra};">tekluma.app</a> ·
        <a href="${WEB}/privacidad" style="color:${C.pizarra};">Privacidad</a> ·
        <a href="${WEB}/reclamaciones" style="color:${C.pizarra};">Libro de Reclamaciones</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
