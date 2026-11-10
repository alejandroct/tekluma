import { Linking, Share } from "react-native";
import type { EstadoDiaria, PreguntaDiaria } from "@tekluma/shared";
import { API_URL, api } from "./auth";

/** Sitio público donde se juega sin la app (api.dev.tekluma.app → dev.tekluma.app). */
export const WEB_URL = API_URL.includes("://api.") ? API_URL.replace("://api.", "://") : "https://tekluma.app";

export const obtenerDiaria = () => api<PreguntaDiaria>("/diaria");

export const intentarDiaria = (numero: number, opcion: number) =>
  api<EstadoDiaria>("/diaria/intento", { method: "POST", body: JSON.stringify({ numero, opcion }) });

/** Resultado sin spoilers, pensado para grupos de WhatsApp. */
export function textoCompartir(p: PreguntaDiaria, estado: EstadoDiaria) {
  const casillas = estado.intentos.map((o) => (o === estado.solucion?.correcta ? "✅" : "❌")).join("");
  const marcador = estado.resuelta ? `${estado.intentos.length}/${p.intentosMax}` : `X/${p.intentosMax}`;
  const racha = estado.racha && estado.racha > 1 ? `\n🔥 Racha: ${estado.racha} días` : "";
  return `Tekluma #${p.numero} · ${p.norma} 🏗️\n${casillas} ${marcador}${racha}\n¿Tú la sacas? ${WEB_URL}/diaria?n=${p.numero}`;
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
