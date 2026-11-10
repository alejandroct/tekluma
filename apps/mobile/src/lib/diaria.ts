import { Linking, Share } from "react-native";
import type { EstadoDiaria, PreguntaDiaria } from "@tekluma/shared";
import { API_URL, api } from "./auth";

/** Sitio público donde se juega sin la app (api.dev.tekluma.app → dev.tekluma.app). */
export const WEB_URL = API_URL.includes("://api.") ? API_URL.replace("://api.", "://") : "https://tekluma.app";

export const obtenerDiaria = () => api<PreguntaDiaria>("/diaria");

export const intentarDiaria = (numero: number, opcion: number) =>
  api<EstadoDiaria>("/diaria/intento", { method: "POST", body: JSON.stringify({ numero, opcion }) });

/** Resultado sin spoilers, pensado para grupos de WhatsApp. */
/**
 * Text to share after playing. It carries the question and its options (so the group debates in
 * the chat before opening the link), the result without revealing the answer, a stat that
 * provokes and a clear call to play. Keep in sync with textoCompartir in apps/web/diaria.html.
 */
export function textoCompartir(p: PreguntaDiaria, estado: EstadoDiaria) {
  const corta = (t: string) => (t.length > 70 ? `${t.slice(0, 67).trimEnd()}…` : t);
  const casillas = estado.intentos.map((o) => (o === estado.solucion?.correcta ? "✅" : "❌")).join("");
  const n = estado.intentos.length;
  const resultado = !estado.resuelta
    ? `${casillas} Hoy me ganó la norma 😅`
    : n === 1
      ? `${casillas} La saqué a la primera 💪`
      : `${casillas} La saqué al ${n}.º intento`;
  const dato =
    estado.aPrimera === undefined
      ? ""
      : estado.aPrimera <= 50
        ? `\n📊 Solo el ${estado.aPrimera} % la acierta a la primera`
        : `\n📊 El ${estado.aPrimera} % la acierta a la primera. ¿Y tú?`;
  const racha = estado.racha && estado.racha > 1 ? `\n🔥 Llevo ${estado.racha} días seguidos` : "";
  const figura = p.imagenUrl ? " 📐 (con figura)" : "";
  return [
    `🏗️ *PREGUNTA DEL DÍA #${p.numero}* · ${p.norma}`,
    "",
    `*${p.pregunta}*${figura}`,
    "",
    ...p.opciones.map((o, i) => `${"ABCDEF"[i]}) ${corta(o)}`),
    "",
    `${resultado}${dato}${racha}`,
    "",
    "👉 ¿Cuál marcarías? Respóndela gratis, sin instalar nada:",
    `${WEB_URL}/diaria?n=${p.numero}`,
  ].join("\n");
}

export async function compartirPorWhatsApp(texto: string) {
  const url = `whatsapp://send?text=${encodeURIComponent(texto)}`;
  if (await Linking.canOpenURL(url).catch(() => false)) return Linking.openURL(url);
  return Share.share({ message: texto });
}

export const compartirOtros = (texto: string) => Share.share({ message: texto });

/** "5 h 12 min" hasta la medianoche de Lima (UTC−5, sin horario de verano). */
export function faltaParaLaSiguiente(ahora = Date.now()) {
  const lima = ahora - 5 * 3_600_000;
  const minutos = Math.ceil((86_400_000 - (lima % 86_400_000)) / 60_000);
  const h = Math.floor(minutos / 60);
  return h > 0 ? `${h} h ${minutos % 60} min` : `${minutos} min`;
}
