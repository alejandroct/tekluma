import type { EstadoCupo, EstadoRecompensas } from "@tekluma/shared";
import { api, solicitar } from "./auth";
import { guardarAjuste, leerAjuste } from "./db";

const CLAVE = "cupo";

const hoyLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());

function guardar(estado: EstadoCupo) {
  guardarAjuste(CLAVE, estado);
  return estado;
}

/** Último estado conocido de hoy, para funcionar sin conexión. */
export function cupoEnCache(): EstadoCupo | null {
  const estado = leerAjuste<EstadoCupo>(CLAVE);
  return estado?.fecha === hoyLima() ? estado : null;
}

export async function obtenerCupo() {
  return guardar(await api<EstadoCupo>("/cupo"));
}

/**
 * Pide permiso para mostrar una tarjeta. Sin conexión decide con el último estado conocido
 * (el servidor es la fuente de verdad cuando hay red).
 */
export async function consumirTarjeta(tarjetaId: string): Promise<{ permitido: boolean; estado: EstadoCupo | null }> {
  try {
    const res = await solicitar("/cupo/consumir", { method: "POST", body: JSON.stringify({ tarjetaId }) });
    if (res.ok || res.status === 429) {
      const { permitido, estado } = (await res.json()) as { permitido: boolean; estado: EstadoCupo };
      return { permitido, estado: guardar(estado) };
    }
    if (res.status === 404) return { permitido: true, estado: cupoEnCache() }; // tarjeta retirada del servidor
    throw new Error(`consumir → ${res.status}`);
  } catch {
    const cache = cupoEnCache();
    if (!cache) return { permitido: true, estado: null };
    if (cache.premium) return { permitido: true, estado: cache };
    if (cache.restantes <= 0) return { permitido: false, estado: cache };
    return { permitido: true, estado: guardar({ ...cache, usadas: cache.usadas + 1, restantes: cache.restantes - 1 }) };
  }
}

export async function ampliarConMonedas() {
  const res = await solicitar("/cupo/monedas", { method: "POST" });
  const { ampliado, estado } = (await res.json()) as { ampliado: boolean; estado: EstadoCupo };
  return { ampliado, estado: guardar(estado) };
}

export type TipoRecompensa = "tarjetas" | "monedas";

/** Solo en desarrollo: el servidor simula la verificación de AdMob. */
export async function acreditarAnuncioDePrueba(tipo: TipoRecompensa) {
  const { estado } = await api<{ acreditado: boolean; estado: EstadoCupo }>(`/cupo/anuncio-prueba?tipo=${tipo}`, { method: "POST" });
  return guardar(estado);
}

export const obtenerRecompensas = () => api<EstadoRecompensas>("/cupo/recompensas");

export const hacerCheckIn = () =>
  api<{ otorgadas: number; estado: EstadoRecompensas }>("/cupo/recompensas/check-in", { method: "POST" });
