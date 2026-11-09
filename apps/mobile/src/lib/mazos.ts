import type { Accesos, MazoCatalogo, PaqueteMazo } from "@tekluma/shared";
import { api } from "./auth";
import { db } from "./db";

export type MazoConAcceso = MazoCatalogo & { abierto: boolean; descargado: boolean; desactualizado: boolean };

/** Catálogo del servidor combinado con los accesos del usuario y lo que ya está en el dispositivo. */
export async function obtenerCatalogo(): Promise<MazoConAcceso[]> {
  const [catalogo, accesos] = await Promise.all([api<MazoCatalogo[]>("/catalogo"), api<Accesos>("/mazos/accesos")]);
  const locales = new Map(
    db.getAllSync<{ mazo_id: string; version: number }>("select mazo_id, version from paquetes").map((p) => [p.mazo_id, p.version]),
  );
  return catalogo.map((m) => ({
    ...m,
    abierto: m.acceso === "gratis" || accesos.premium || accesos.desbloqueados.includes(m.id),
    descargado: locales.has(m.id),
    desactualizado: (locales.get(m.id) ?? m.versionPublicada) < m.versionPublicada,
  }));
}

export async function descargarPaquete(mazoId: string): Promise<PaqueteMazo> {
  const paquete = await api<PaqueteMazo>(`/mazos/${mazoId}/paquete`);
  db.runSync(
    `insert into paquetes (mazo_id, version, contenido) values (?, ?, ?)
     on conflict (mazo_id) do update set version = excluded.version, contenido = excluded.contenido`,
    mazoId,
    paquete.version,
    JSON.stringify(paquete),
  );
  return paquete;
}

export function paqueteLocal(mazoId: string): PaqueteMazo | null {
  const fila = db.getFirstSync<{ contenido: string }>("select contenido from paquetes where mazo_id = ?", mazoId);
  return fila ? (JSON.parse(fila.contenido) as PaqueteMazo) : null;
}

export function paquetesLocales(): PaqueteMazo[] {
  return db.getAllSync<{ contenido: string }>("select contenido from paquetes").map((f) => JSON.parse(f.contenido) as PaqueteMazo);
}

/** Devuelve el saldo restante, o lanza si no alcanza. */
export async function desbloquear(mazoId: string) {
  return api<{ desbloqueado: boolean; saldo?: number }>(`/mazos/${mazoId}/desbloquear`, { method: "POST" });
}
