import type { EstadoLiga, FilaRanking, Region, Universidad } from "@tekluma/shared";
import { api } from "./auth";

export const obtenerLiga = () => api<EstadoLiga>("/liga");
export const rankingUniversidades = () => api<FilaRanking[]>("/liga/universidades");
export const rankingRegiones = () => api<FilaRanking[]>("/liga/regiones");

export const guardarAfiliacion = (datos: { universidad?: Universidad | null; region?: Region | null }) =>
  api<EstadoLiga>("/liga/afiliacion", { method: "PUT", body: JSON.stringify(datos) });
