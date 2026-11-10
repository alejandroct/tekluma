import type { MazoCatalogo, PaqueteMazo } from "@tekluma/shared";
import { api } from "./auth";
import { obtenerCupo } from "./cupo";
import { db } from "./db";
import { restaurarProgreso } from "./repaso";

export type MazoConAcceso = MazoCatalogo & { abierto: boolean; descargado: boolean; desactualizado: boolean };

/** Catálogo del servidor combinado con el plan del usuario y lo que ya está en el dispositivo. */
export async function obtenerCatalogo(): Promise<MazoConAcceso[]> {
  const [catalogo, cupo] = await Promise.all([api<MazoCatalogo[]>("/catalogo"), obtenerCupo()]);
  // Mazos retirados del catálogo ya no se pueden estudiar: se borran del dispositivo.
  const vigentes = new Set(catalogo.map((m) => m.id));
  for (const { mazo_id } of db.getAllSync<{ mazo_id: string }>("select mazo_id from paquetes")) {
    if (!vigentes.has(mazo_id)) {
      db.runSync("delete from paquetes where mazo_id = ?", mazo_id);
      db.runSync("delete from estados where mazo_id = ?", mazo_id);
    }
  }
  // Mazos Premium sin suscripción vigente (p. ej. venció) tampoco quedan en el dispositivo.
  if (!cupo.premium) {
    for (const m of catalogo) if (m.acceso === "premium") db.runSync("delete from paquetes where mazo_id = ?", m.id);
  }
  const locales = new Map(
    db.getAllSync<{ mazo_id: string; version: number }>("select mazo_id, version from paquetes").map((p) => [p.mazo_id, p.version]),
  );
  return catalogo.map((m) => ({
    ...m,
    abierto: m.acceso === "free" || cupo.premium,
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
  // Si no hay conexión el mazo igual queda listo; el progreso se restaura en la próxima descarga.
  await restaurarProgreso(mazoId).catch(() => {});
  return paquete;
}

export function paqueteLocal(mazoId: string): PaqueteMazo | null {
  const fila = db.getFirstSync<{ contenido: string }>("select contenido from paquetes where mazo_id = ?", mazoId);
  return fila ? (JSON.parse(fila.contenido) as PaqueteMazo) : null;
}

export function paquetesLocales(): PaqueteMazo[] {
  return db.getAllSync<{ contenido: string }>("select contenido from paquetes").map((f) => JSON.parse(f.contenido) as PaqueteMazo);
}
