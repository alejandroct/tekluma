import { sql, type SQL } from "drizzle-orm";
import { db } from "./db/client";
import { estadoCupo, estadoRecompensas, fechaLima } from "./cupo";
import { semanaDe } from "./liga";

/**
 * Métricas para el propietario (panel → Usuarios y Métricas). Solo lectura.
 * Las fechas son días de Lima, como el cupo y la liga.
 */

// Neon y PGlite devuelven las filas en `rows`; el tipo genérico de la base no lo declara.
const filas = async <T>(consulta: SQL) => ((await db.execute(consulta)) as unknown as { rows: T[] }).rows;
const DIA = 86_400_000;
const sumarDias = (dia: string, n: number) => new Date(Date.parse(dia) + n * DIA).toISOString().slice(0, 10);
/** Fecha y hora en ISO 8601 (Neon y PGlite las devuelven en formatos distintos). */
const iso = (columna: string) => sql.raw(`to_json(${columna}) #>> '{}'`);
const altaLima = sql.raw(`(u.created_at at time zone 'America/Lima')::date`);

/** Un usuario está activo un día si vio tarjetas, jugó la pregunta del día, sumó puntos o usó el cupo. */
const actividad = sql`(
  select user_id, day from daily_card_views
  union select user_id, day from daily_answers
  union select user_id, day from xp_events
  union select user_id, day from daily_quotas
)`;

export async function metricasGenerales() {
  const hoy = fechaLima();
  const hace7 = sumarDias(hoy, -6);
  const hace30 = sumarDias(hoy, -29);

  const [totales] = await filas<Record<string, number>>(sql`
    select
      (select count(*) from users)::int as usuarios,
      (select count(*) from users where name <> '')::int as "conPerfil",
      (select count(*) from users where premium_until > now())::int as premium,
      (select count(*) from users u where ${altaLima} = ${hoy}::date)::int as "nuevosHoy",
      (select count(*) from users u where ${altaLima} >= ${hace7}::date)::int as "nuevos7",
      (select count(*) from users u where ${altaLima} >= ${hace30}::date)::int as "nuevos30",
      (select count(distinct user_id) from ${actividad} a where day = ${hoy}::date)::int as "activosHoy",
      (select count(distinct user_id) from ${actividad} a where day >= ${hace7}::date)::int as "activos7",
      (select count(distinct user_id) from ${actividad} a where day >= ${hace30}::date)::int as "activos30",
      (select count(*) from daily_card_views where day = ${hoy}::date)::int as "tarjetasHoy",
      (select count(*) from daily_card_views where day >= ${hace7}::date)::int as "tarjetas7",
      (select count(*) from daily_answers where day = ${hoy}::date)::int as "diariaHoy",
      (select count(*) from daily_answers where day = ${hoy}::date and solved)::int as "diariaAciertosHoy",
      (select count(*) from duels where created_at >= now() - interval '7 days')::int as "duelos7",
      (select count(*) from duel_plays where created_at >= now() - interval '7 days')::int as "partidas7",
      (select count(*) from ad_rewards where day >= ${hace7}::date)::int as "anuncios7",
      (select coalesce(sum(amount), 0) from coin_transactions)::int as "monedasEnCirculacion"
  `);

  const serie = await filas<{ dia: string; nuevos: number; activos: number; tarjetas: number }>(sql`
    select d::date::text as dia,
      (select count(*) from users u where ${altaLima} = d::date)::int as nuevos,
      (select count(distinct user_id) from ${actividad} a where a.day = d::date)::int as activos,
      (select count(*) from daily_card_views v where v.day = d::date)::int as tarjetas
    from generate_series(${hace30}::date, ${hoy}::date, interval '1 day') d
    order by d
  `);

  // Cohorte de quienes se registraron hace 8 a 37 días: ¿volvieron al día siguiente y a la semana?
  const [retencion] = await filas<{ cohorte: number; d1: number; d7: number }>(sql`
    with cohorte as (
      select u.id, ${altaLima} as alta from users u
      where ${altaLima} between ${sumarDias(hoy, -37)}::date and ${sumarDias(hoy, -8)}::date
    )
    select count(*)::int as cohorte,
      count(*) filter (where exists (select 1 from ${actividad} a where a.user_id = c.id and a.day = c.alta + 1))::int as d1,
      count(*) filter (where exists (select 1 from ${actividad} a where a.user_id = c.id and a.day = c.alta + 7))::int as d7
    from cohorte c
  `);

  const monedas = await filas<{ motivo: string; ganadas: number; gastadas: number; movimientos: number }>(sql`
    select reason::text as motivo,
      coalesce(sum(amount) filter (where amount > 0), 0)::int as ganadas,
      coalesce(-sum(amount) filter (where amount < 0), 0)::int as gastadas,
      count(*)::int as movimientos
    from coin_transactions
    where created_at >= now() - interval '30 days'
    group by reason
    order by movimientos desc
  `);

  const reparto = (columna: string, limite: number) =>
    filas<{ valor: string | null; usuarios: number }>(sql`
      select ${sql.raw(columna)} as valor, count(*)::int as usuarios
      from users group by 1 order by usuarios desc limit ${limite}
    `);

  return {
    hoy,
    totales,
    serie,
    retencion,
    monedas,
    profesiones: await reparto("profession", 10),
    regiones: await reparto("region", 10),
    universidades: await reparto("university", 10),
  };
}

export const ORDENES = { recientes: "\"createdAt\" desc", actividad: "ultima desc nulls last", monedas: "monedas desc", puntos: "puntos desc" } as const;
export const FILTROS = ["todos", "premium", "activos7", "equipo"] as const;
const POR_PAGINA = 50;

export async function listarUsuarios(o: { q?: string; orden: keyof typeof ORDENES; filtro: (typeof FILTROS)[number]; pagina: number }) {
  const busqueda = o.q?.trim() ? `%${o.q.trim()}%` : null;
  const condiciones = [
    busqueda ? sql`(u.email ilike ${busqueda} or u.name ilike ${busqueda})` : sql`true`,
    o.filtro === "premium" ? sql`u.premium_until > now()` : sql`true`,
    o.filtro === "equipo" ? sql`u.staff_role is not null` : sql`true`,
    o.filtro === "activos7"
      ? sql`exists (select 1 from ${actividad} a where a.user_id = u.id and a.day >= ${sumarDias(fechaLima(), -6)}::date)`
      : sql`true`,
  ];
  const donde = sql.join(condiciones, sql` and `);

  const usuarios = await filas<{
    id: string;
    email: string;
    name: string;
    profession: string | null;
    university: string | null;
    region: string | null;
    createdAt: string;
    premiumUntil: string | null;
    staffRole: string | null;
    monedas: number;
    tarjetas: number;
    puntos: number;
    ultima: string | null;
  }>(sql`
    select * from (
      select u.id, u.email, u.name, u.profession, u.university, u.region, ${iso("u.created_at")} as "createdAt",
        ${iso("u.premium_until")} as "premiumUntil", u.staff_role::text as "staffRole",
        coalesce((select sum(amount) from coin_transactions c where c.user_id = u.id), 0)::int as monedas,
        (select count(*) from review_states r where r.user_id = u.id)::int as tarjetas,
        coalesce((select sum(points) from xp_events x where x.user_id = u.id), 0)::int as puntos,
        (select max(day) from ${actividad} a where a.user_id = u.id)::text as ultima
      from users u
      where ${donde}
    ) u
    order by ${sql.raw(ORDENES[o.orden])}
    limit ${POR_PAGINA} offset ${(o.pagina - 1) * POR_PAGINA}
  `);
  const [{ total } = { total: 0 }] = await filas<{ total: number }>(sql`select count(*)::int as total from users u where ${donde}`);
  return { usuarios, total, pagina: o.pagina, porPagina: POR_PAGINA };
}

/** Plataforma de la última sesión, sin guardar ni mostrar la IP. */
function plataforma(agente: string | null) {
  if (!agente) return null;
  if (/iphone|ipad|ios|darwin/i.test(agente)) return "iOS";
  if (/android|okhttp/i.test(agente)) return "Android";
  return "Web";
}

export async function fichaUsuario(id: string) {
  const [u] = await filas<{
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    profession: string | null;
    university: string | null;
    region: string | null;
    staffRole: string | null;
    premiumUntil: string | null;
    createdAt: string;
  }>(sql`
    select id, email, name, email_verified as "emailVerified", profession, university, region, staff_role::text as "staffRole",
      ${iso("premium_until")} as "premiumUntil", ${iso("created_at")} as "createdAt"
    from users where id = ${id}
  `);
  if (!u) return null;

  const hoy = fechaLima();
  const [sesion] = await filas<{ ultimaSesion: string; agente: string | null; sesiones: number }>(sql`
    select ${iso("max(updated_at)")} as "ultimaSesion",
      (array_agg(user_agent order by updated_at desc))[1] as agente,
      count(*) filter (where expires_at > now())::int as sesiones
    from sessions where user_id = ${id}
  `);
  const proveedores = (await filas<{ providerId: string }>(sql`select distinct provider_id as "providerId" from accounts where user_id = ${id}`)).map(
    (f) => f.providerId,
  );

  const [progreso] = await filas<Record<string, number | string | null>>(sql`
    select count(*)::int as tarjetas,
      count(*) filter (where state = 2)::int as dominadas,
      count(*) filter (where state in (1, 3))::int as aprendiendo,
      count(*) filter (where due <= now())::int as pendientes,
      coalesce(sum(reps), 0)::int as repasos,
      coalesce(sum(lapses), 0)::int as olvidos,
      ${iso("max(last_review)")} as "ultimoRepaso"
    from review_states where user_id = ${id}
  `);
  const mazos = await filas<{ mazo: string; tarjetas: number; dominadas: number }>(sql`
    select d.title as mazo, count(*)::int as tarjetas, count(*) filter (where r.state = 2)::int as dominadas
    from review_states r join cards c on c.id = r.card_id join decks d on d.id = c.deck_id
    where r.user_id = ${id} group by d.title order by tarjetas desc
  `);

  const [juego] = await filas<Record<string, number | string | null>>(sql`
    select
      (select count(*) from daily_answers where user_id = ${id})::int as "diariaJugadas",
      (select count(*) from daily_answers where user_id = ${id} and solved)::int as "diariaAciertos",
      (select count(*) from duels where creator_id = ${id})::int as "duelosCreados",
      (select count(*) from duel_plays where user_id = ${id})::int as "duelosJugados",
      (select coalesce(sum(points), 0) from xp_events where user_id = ${id})::int as "puntosTotal",
      (select coalesce(sum(points), 0) from xp_events where user_id = ${id} and day >= ${semanaDe(hoy)}::date)::int as "puntosSemana",
      (select division::text from league_memberships where user_id = ${id} and week = ${semanaDe(hoy)}::date) as division,
      (select count(*) from ad_rewards where user_id = ${id})::int as anuncios
  `);

  const movimientos = await filas<{ fecha: string; monto: number; motivo: string }>(sql`
    select ${iso("created_at")} as fecha, amount as monto, reason::text as motivo
    from coin_transactions where user_id = ${id} order by created_at desc limit 30
  `);
  const serie = await filas<{ dia: string; tarjetas: number; activo: boolean }>(sql`
    select d::date::text as dia,
      (select count(*) from daily_card_views v where v.user_id = ${id} and v.day = d::date)::int as tarjetas,
      exists (select 1 from ${actividad} a where a.user_id = ${id} and a.day = d::date) as activo
    from generate_series(${sumarDias(hoy, -29)}::date, ${hoy}::date, interval '1 day') d
    order by d
  `);

  const [cupo, recompensas] = await Promise.all([estadoCupo(id), estadoRecompensas(id)]);

  return {
    usuario: u,
    acceso: { proveedores, ultimaSesion: sesion?.ultimaSesion ?? null, plataforma: plataforma(sesion?.agente ?? null), sesionesAbiertas: sesion?.sesiones ?? 0 },
    monedas: recompensas.monedas,
    racha: recompensas.checkIn.racha,
    cupoHoy: { limite: cupo.limite, usadas: cupo.usadas, anuncios: cupo.anunciosVistos },
    progreso,
    mazos,
    juego,
    movimientos,
    serie,
  };
}
