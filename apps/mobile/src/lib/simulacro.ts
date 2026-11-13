import type { OpcionesSimulacro, Simulacro } from "@tekluma/shared";
import { api, solicitar } from "./auth";
import { db, guardarAjuste, leerAjuste } from "./db";

export const opcionesSimulacro = () => api<OpcionesSimulacro>("/simulacros");
export const verSimulacro = (id: string) => api<Simulacro>(`/simulacros/${id}`);

/** Errores del servidor con mensaje para mostrar (límite del plan, pocas preguntas). */
export async function crearSimulacro(datos: { norma: string; preguntas: number; mazos?: string[] }): Promise<Simulacro> {
  const res = await solicitar("/simulacros", { method: "POST", body: JSON.stringify(datos) });
  if (!res.ok) throw new Error((await res.text()) || "No pudimos crear el simulacro");
  return res.json() as Promise<Simulacro>;
}

export async function entregarSimulacro(id: string, respuestas: (number | null)[]): Promise<Simulacro> {
  const r = await api<Simulacro>(`/simulacros/${id}/entregar`, { method: "POST", body: JSON.stringify({ respuestas }) });
  db.runSync("delete from ajustes where clave = ?", clave(id));
  return r;
}

/** Las respuestas quedan en el teléfono mientras se rinde: cerrar la app no las pierde. */
const clave = (id: string) => `simulacro:${id}`;
export const respuestasGuardadas = (id: string, total: number) =>
  leerAjuste<(number | null)[]>(clave(id)) ?? Array.from({ length: total }, () => null);
export const guardarRespuestas = (id: string, respuestas: (number | null)[]) => guardarAjuste(clave(id), respuestas);

/** «E.060 · Cap. 7 · Detalles del refuerzo» → «Cap. 7 · Detalles del refuerzo». */
export const nombreCapitulo = (mazo: string) => mazo.replace(/^[A-Z]+\.\d+\s*·\s*/, "");

export const reloj = (segundos: number) => {
  const s = Math.max(0, Math.ceil(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
