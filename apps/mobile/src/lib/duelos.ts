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

/** Mensaje para el grupo: el marcador provoca, el enlace se juega sin instalar nada. */
export function textoReto(r: ResultadoDuelo) {
  const yo = r.jugadas.find((j) => j.soyYo);
  const norma = r.norma === "RNE" ? "del RNE" : `de la ${r.norma}`;
  const marcador = yo ? `Saqué ${yo.aciertos}/5 en ${yo.segundos} s. ¿Me ganas?` : "¿Me ganas?";
  return `⚔️ Te reto a un duelo ${norma} en Tekluma\n${marcador}\n${enlaceDuelo(r.codigo)}`;
}
