import { api, solicitar } from "./auth";
import { WEB_URL } from "./diaria";

export type PartidaCreada = { codigo: string; clave: string };
export type MiPartida = PartidaCreada & { norma: string; fase: string; creadaEn: string };

export async function crearPartida(datos: { norma?: string; preguntas: number; segundos: number }): Promise<PartidaCreada> {
  const res = await solicitar("/vivo", { method: "POST", body: JSON.stringify(datos) });
  if (!res.ok) throw new Error((await res.text()) || "No pudimos crear la partida");
  return res.json() as Promise<PartidaCreada>;
}

export const misPartidas = () => api<MiPartida[]>("/vivo/mias");

/** La pantalla para proyectar (lleva la clave del anfitrión: no compartirla). */
export const enlaceAnfitrion = (p: PartidaCreada) => `${WEB_URL}/vivo?c=${p.codigo}&k=${encodeURIComponent(p.clave)}`;
/** Lo que se comparte con el grupo. */
export const enlaceJugador = (codigo: string) => `${WEB_URL}/vivo?c=${codigo}`;

export const textoInvitacion = (codigo: string, norma: string) =>
  [`🎯 *Partida en vivo Tekluma* · ${norma === "RNE" ? "Todo el RNE" : norma}`, "", `Entra con el código *${codigo}*:`, enlaceJugador(codigo), "", "Desde el celular, sin instalar nada."].join("\n");
