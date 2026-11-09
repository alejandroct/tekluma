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

  create table if not exists paquetes (
    mazo_id text primary key not null,
    version integer not null,
    contenido text not null
  );
`);
