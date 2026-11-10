import type { Duelo, ResultadoDuelo, ResumenDuelo } from "@tekluma/shared";
import { api } from "./auth";
import { WEB_URL } from "./diaria";

export const normasDuelo = () => api<string[]>("/duelos/normas");
export const misDuelos = () => api<ResumenDuelo[]>("/duelos/mios");
export const verDuelo = (codigo: string) => api<Duelo>(`/duelos/${codigo}`);

export const crearDuelo = (norma?: string) => api<Duelo>("/duelos", { method: "POST", body: JSON.stringify({ norma }) });

export const jugarDuelo = (codigo: string, respuestas: (number | null)[], segundos: number) =>
  api<ResultadoDuelo>(`/duelos/${codigo}/jugar`, { method: "POST", body: JSON.stringify({ respuestas, segundos }) });

export const enlaceDuelo = (codigo: string) => `${WEB_URL}/duelo?c=${codigo}`;

/**
 * Mensaje para el grupo: reglas en una línea, mi marcador con casillas (sin revelar respuestas),
 * mi puesto en el duelo, la primera pregunta como anzuelo y el enlace que se juega sin instalar
 * nada. Mantener igual que en apps/web/duelo.html.
 */
export function textoReto(r: ResultadoDuelo, primeraPregunta?: string) {
  const yo = r.jugadas.find((j) => j.soyYo);
  const puesto = r.jugadas.findIndex((j) => j.soyYo);
  const total = r.jugadas.length;
  const casillas = (r.solucion ?? []).map((s) => (s.elegida === s.correcta ? "✅" : "❌")).join("");
  const ranking = !yo
    ? ""
    : total === 1
      ? "Nadie me ha ganado todavía. ¿Serás el primero?"
      : puesto === 0
        ? `🏆 Voy 1.º de ${total}. A ver quién me baja.`
        : `Voy ${puesto + 1}.º de ${total}. ¿Llegas al podio?`;
  return [
    `⚔️ *DUELO TEKLUMA* · ${r.norma === "RNE" ? "Todo el RNE" : r.norma}`,
    "5 preguntas · 1 intento · gana quien acierta más y más rápido",
    ...(yo ? ["", `Mi marcador: *${yo.aciertos}/5 en ${yo.segundos} s*`, casillas, ranking] : []),
    ...(primeraPregunta ? ["", "Arranca así:", `*${primeraPregunta}*`] : []),
    "",
    "👉 ¿Me ganas? Juega gratis, sin instalar nada:",
    enlaceDuelo(r.codigo),
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}
