import { randomUUID } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import type { EstadoCupo, ReglasCupo } from "@tekluma/shared";
import { db, type Db } from "./db/client";
import { cuposDiarios, movimientosMonedas, recompensasAnuncio, tarjetas, usuarios, vistasDiarias } from "./db/schema";

const num = (valor: string | undefined, porDefecto: number) => (valor ? Number(valor) : porDefecto);

/** Ajustables por variables de entorno sin publicar una versión nueva de la app. */
export const reglas: ReglasCupo = {
  cupoGratis: num(process.env.CUPO_GRATIS, 15),
  cupoBienvenida: num(process.env.CUPO_BIENVENIDA, 30),
  diasBienvenida: num(process.env.CUPO_DIAS_BIENVENIDA, 3),
  tarjetasPorAnuncio: num(process.env.CUPO_TARJETAS_POR_ANUNCIO, 5),
  maxAnunciosDia: num(process.env.CUPO_MAX_ANUNCIOS_DIA, 8),
  maxIntersticialesDia: num(process.env.CUPO_MAX_INTERSTICIALES_DIA, 2),
  tarjetasPorCompraMonedas: num(process.env.CUPO_TARJETAS_POR_COMPRA_MONEDAS, 5),
};

/** El día comercial es el de Lima, sin importar dónde corra el servidor. */
export function fechaLima(momento = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(momento);
}

const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);

type Consulta = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Serializa las operaciones de un usuario para que dos peticiones simultáneas no se salten el límite. */
const bloquearUsuario = (tx: Consulta, usuarioId: string) => tx.execute(sql`select pg_advisory_xact_lock(hashtext(${usuarioId}))`);

async function leerEstado(q: Consulta, usuarioId: string, fecha = fechaLima()): Promise<EstadoCupo> {
  const [usuario] = await q
    .select({ premiumHasta: usuarios.premiumHasta, creadoEn: usuarios.creadoEn })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId));
  if (!usuario) throw new Error("Usuario no existe");

  const [cupo] = await q
    .select()
    .from(cuposDiarios)
    .where(and(eq(cuposDiarios.usuarioId, usuarioId), eq(cuposDiarios.fecha, fecha)));
  const [{ usadas } = { usadas: 0 }] = await q
    .select({ usadas: count() })
    .from(vistasDiarias)
    .where(and(eq(vistasDiarias.usuarioId, usuarioId), eq(vistasDiarias.fecha, fecha)));
  const [{ monedas } = { monedas: 0 }] = await q
    .select({ monedas: sql<number>`coalesce(sum(${movimientosMonedas.cantidad}), 0)::int` })
    .from(movimientosMonedas)
    .where(eq(movimientosMonedas.usuarioId, usuarioId));

  const enBienvenida = diasEntre(fechaLima(usuario.creadoEn), fecha) < reglas.diasBienvenida;
  const limite = (enBienvenida ? reglas.cupoBienvenida : reglas.cupoGratis) + (cupo?.extra ?? 0);

  return {
    fecha,
    premium: Boolean(usuario.premiumHasta && usuario.premiumHasta > new Date()),
    limite,
    usadas,
    restantes: Math.max(0, limite - usadas),
    anunciosVistos: cupo?.anuncios ?? 0,
    monedas,
    reglas,
  };
}

export const estadoCupo = (usuarioId: string) => leerEstado(db, usuarioId);

/**
 * Registra que el usuario va a ver una tarjeta hoy. Una tarjeta ya vista hoy no consume
 * cupo otra vez; Premium no tiene límite.
 */
export async function consumirTarjeta(usuarioId: string, tarjetaId: string) {
  const [existe] = await db.select({ id: tarjetas.id }).from(tarjetas).where(eq(tarjetas.id, tarjetaId));
  if (!existe) return null;

  return db.transaction(async (tx) => {
    await bloquearUsuario(tx, usuarioId);
    const fecha = fechaLima();
    const [yaVista] = await tx
      .select()
      .from(vistasDiarias)
      .where(and(eq(vistasDiarias.usuarioId, usuarioId), eq(vistasDiarias.fecha, fecha), eq(vistasDiarias.tarjetaId, tarjetaId)));
    const antes = await leerEstado(tx, usuarioId, fecha);
    if (!yaVista && !antes.premium && antes.restantes === 0) return { permitido: false, estado: antes };
    if (!yaVista) await tx.insert(vistasDiarias).values({ usuarioId, fecha, tarjetaId });
    return { permitido: true, estado: await leerEstado(tx, usuarioId, fecha) };
  });
}

async function ampliar(tx: Consulta, usuarioId: string, fecha: string, tarjetasExtra: number, anuncio: boolean) {
  await tx
    .insert(cuposDiarios)
    .values({ usuarioId, fecha, extra: tarjetasExtra, anuncios: anuncio ? 1 : 0 })
    .onConflictDoUpdate({
      target: [cuposDiarios.usuarioId, cuposDiarios.fecha],
      set: {
        extra: sql`${cuposDiarios.extra} + ${tarjetasExtra}`,
        anuncios: sql`${cuposDiarios.anuncios} + ${anuncio ? 1 : 0}`,
      },
    });
}

/**
 * Acredita un anuncio con recompensa visto. La transacción de AdMob hace la operación
 * idempotente; por encima del tope diario se registra pero no suma tarjetas.
 */
export async function acreditarAnuncio(usuarioId: string, transaccion: string) {
  return db.transaction(async (tx) => {
    await bloquearUsuario(tx, usuarioId);
    const fecha = fechaLima();
    const [nueva] = await tx.insert(recompensasAnuncio).values({ transaccion, usuarioId, fecha }).onConflictDoNothing().returning();
    const estado = await leerEstado(tx, usuarioId, fecha);
    if (!nueva || estado.anunciosVistos >= reglas.maxAnunciosDia) return { acreditado: false, estado };
    await ampliar(tx, usuarioId, fecha, reglas.tarjetasPorAnuncio, true);
    return { acreditado: true, estado: await leerEstado(tx, usuarioId, fecha) };
  });
}

/** Cambia monedas por tarjetas extra del día (1 moneda = 1 tarjeta). */
export async function ampliarConMonedas(usuarioId: string) {
  const costo = reglas.tarjetasPorCompraMonedas;
  return db.transaction(async (tx) => {
    await bloquearUsuario(tx, usuarioId);
    const fecha = fechaLima();
    const estado = await leerEstado(tx, usuarioId, fecha);
    if (estado.monedas < costo) return { ampliado: false, estado };
    await tx.insert(movimientosMonedas).values({ usuarioId, cantidad: -costo, motivo: "tarjetas_extra", referencia: randomUUID() });
    await ampliar(tx, usuarioId, fecha, costo, false);
    return { ampliado: true, estado: await leerEstado(tx, usuarioId, fecha) };
  });
}
