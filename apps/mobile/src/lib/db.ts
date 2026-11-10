import * as SQLite from "expo-sqlite";

/** Base local: paquetes descargados y estado FSRS de cada tarjeta (offline-first). */
export const db = SQLite.openDatabaseSync("tekluma.db");

db.execSync(`
  create table if not exists estados (
    tarjeta_id text primary key not null,
    mazo_id text not null,
    vence integer not null,
    tarjeta text not null,
    sincronizado integer not null default 0
  );
  create index if not exists estados_mazo_vence on estados (mazo_id, vence);

  create table if not exists ajustes (
    clave text primary key not null,
    valor text not null
  );

  create table if not exists paquetes (
    mazo_id text primary key not null,
    version integer not null,
    contenido text not null
  );
`);

export function leerAjuste<T>(clave: string): T | null {
  const fila = db.getFirstSync<{ valor: string }>("select valor from ajustes where clave = ?", clave);
  return fila ? (JSON.parse(fila.valor) as T) : null;
}

export function guardarAjuste(clave: string, valor: unknown) {
  db.runSync(
    "insert into ajustes (clave, valor) values (?, ?) on conflict (clave) do update set valor = excluded.valor",
    clave,
    JSON.stringify(valor),
  );
}

/** Deja el dispositivo limpio: progreso, ajustes y los mazos descargados (contenido exclusivo de Tekluma). */
export function borrarDatosLocales() {
  db.execSync("delete from estados; delete from ajustes; delete from paquetes;");
}
