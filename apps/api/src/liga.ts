import { and, eq, gte, lt, sql } from "drizzle-orm";
import {
  DIVISIONES,
  REGIONES,
  siglaUniversidad,
  tituloDe,
  UNIVERSIDADES,
  type Division,
  type EstadoLiga,
  type FilaRanking,
  type Region,
  type Universidad,
  type XpSource,
} from "@tekluma/shared";
import { fechaLima } from "./cupo";
import { db, type Db } from "./db/client";
import { leagueMemberships, users, xpEvents } from "./db/schema";

const num = (valor: string | undefined, porDefecto: number) => (valor ? Number(valor) : porDefecto);

/**
 * Daily caps per source and in total, so leagues reward knowing (and coming back every day),
 * not volume: Premium's unlimited reviews cannot buy the ranking.
 */
export const TOPES = {
  review: num(process.env.XP_TOPE_REPASO, 20),
  daily_question: num(process.env.XP_TOPE_DIARIA, 10),
  duel: num(process.env.XP_TOPE_DUELO, 30),
  total: num(process.env.XP_TOPE_DIA, 60),
} satisfies Record<XpSource | "total", number>;

/** Top members that count for a university or region, so big schools don't win just by size. */
const MIEMBROS_QUE_CUENTAN = num(process.env.LIGA_MIEMBROS_RANKING, 20);
/** Share of a division that moves up / down when the week closes. */
const PORCENTAJE_MOVIMIENTO = 0.2;

const DIA = 86_400_000;
const sumarDias = (dia: string, n: number) => new Date(Date.parse(dia) + n * DIA).toISOString().slice(0, 10);

/** Monday of the Lima week that contains `dia`. */
export function semanaDe(dia = fechaLima()) {
  const diaSemana = new Date(`${dia}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return sumarDias(dia, -((diaSemana + 6) % 7));
}

type Consulta = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Awards points, trimmed to what is left of today's caps. Idempotent by (source, reference).
 * Returns the points actually awarded.
 */
export async function sumarPuntos(q: Consulta, userId: string, source: XpSource, reference: string, puntos: number) {
  if (puntos <= 0) return 0;
  const day = fechaLima();
  const hoy = await q
    .select({ source: xpEvents.source, total: sql<number>`sum(${xpEvents.points})::int` })
    .from(xpEvents)
    .where(and(eq(xpEvents.userId, userId), eq(xpEvents.day, day)))
    .groupBy(xpEvents.source);
  const deFuente = hoy.find((h) => h.source === source)?.total ?? 0;
  const total = hoy.reduce((s, h) => s + h.total, 0);
  const otorgables = Math.min(puntos, TOPES[source] - deFuente, TOPES.total - total);
  if (otorgables <= 0) return 0;
  const [fila] = await q
    .insert(xpEvents)
    .values({ userId, day, source, reference, points: otorgables })
    .onConflictDoNothing()
    .returning({ points: xpEvents.points });
  if (fila) await asegurarMembresia(q, userId, semanaDe(day));
  return fila?.points ?? 0;
}

const puntosSemana = (semana: string) =>
  and(gte(xpEvents.day, semana), lt(xpEvents.day, sumarDias(semana, 7)));

/** Members of a division in a week with their points, best first. */
async function tablaDivision(q: Consulta, semana: string, division: Division) {
  return q
    .select({
      userId: leagueMemberships.userId,
      nombre: users.name,
      puntos: sql<number>`coalesce(sum(${xpEvents.points}), 0)::int`,
    })
    .from(leagueMemberships)
    .innerJoin(users, eq(users.id, leagueMemberships.userId))
    .leftJoin(xpEvents, and(eq(xpEvents.userId, leagueMemberships.userId), puntosSemana(semana)))
    .where(and(eq(leagueMemberships.week, semana), eq(leagueMemberships.division, division)))
    .groupBy(leagueMemberships.userId, users.name, leagueMemberships.createdAt)
    .orderBy(sql`3 desc`, leagueMemberships.createdAt);
}

const movimientos = (n: number) => {
  // With very few people there is no real competition: only the leader moves up.
  if (n < 5) return { suben: n >= 2 ? 1 : 0, bajan: 0 };
  const k = Math.max(1, Math.ceil(n * PORCENTAJE_MOVIMIENTO));
  return { suben: k, bajan: k };
};

/**
 * The user's division this week. The first time in a week it is decided from last week's
 * result: top 20% move up, bottom 20% move down; new players start in Adobe.
 */
export async function asegurarMembresia(q: Consulta, userId: string, semana: string): Promise<Division> {
  const [actual] = await q
    .select({ division: leagueMemberships.division })
    .from(leagueMemberships)
    .where(and(eq(leagueMemberships.userId, userId), eq(leagueMemberships.week, semana)));
  if (actual) return actual.division;

  const anterior = sumarDias(semana, -7);
  const [previa] = await q
    .select({ division: leagueMemberships.division })
    .from(leagueMemberships)
    .where(and(eq(leagueMemberships.userId, userId), eq(leagueMemberships.week, anterior)));
  let division: Division = "adobe";
  if (previa) {
    const tabla = await tablaDivision(q, anterior, previa.division);
    const puesto = tabla.findIndex((f) => f.userId === userId);
    const { suben, bajan } = movimientos(tabla.length);
    const nivel = DIVISIONES.findIndex((d) => d.codigo === previa.division);
    let nuevo = nivel;
    if (puesto >= 0 && puesto < suben && tabla[puesto]!.puntos > 0) nuevo = Math.min(nivel + 1, DIVISIONES.length - 1);
    else if (puesto >= tabla.length - bajan) nuevo = Math.max(nivel - 1, 0);
    division = DIVISIONES[nuevo]!.codigo;
  }
  await q.insert(leagueMemberships).values({ userId, week: semana, division }).onConflictDoNothing();
  return division;
}

/**
 * Weekly ranking of a group (university or region): sum of its best members' points.
 * Aggregated in memory: one row per active user this week, fine at this stage.
 */
async function rankingGrupo(columna: typeof users.university | typeof users.region, semana: string) {
  const filas = await db
    .select({ grupo: columna, puntos: sql<number>`sum(${xpEvents.points})::int` })
    .from(xpEvents)
    .innerJoin(users, eq(users.id, xpEvents.userId))
    .where(and(sql`${columna} is not null`, puntosSemana(semana)))
    .groupBy(users.id, columna);
  const porGrupo = new Map<string, number[]>();
  for (const f of filas) porGrupo.set(f.grupo!, [...(porGrupo.get(f.grupo!) ?? []), f.puntos]);
  return [...porGrupo]
    .map(([grupo, lista]) => ({
      grupo,
      puntos: lista
        .sort((a, b) => b - a)
        .slice(0, MIEMBROS_QUE_CUENTAN)
        .reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.puntos - a.puntos)
    .map((f, i) => ({ posicion: i + 1, ...f }));
}

export async function rankingUniversidades(semana = semanaDe(), mia?: string | null): Promise<FilaRanking[]> {
  return (await rankingGrupo(users.university, semana))
    .filter((f) => f.grupo in UNIVERSIDADES)
    .map((f) => ({ posicion: f.posicion, nombre: siglaUniversidad(f.grupo as Universidad), puntos: f.puntos, esMio: f.grupo === mia }));
}

export async function rankingRegiones(semana = semanaDe(), mia?: string | null): Promise<FilaRanking[]> {
  return (await rankingGrupo(users.region, semana))
    .filter((f) => f.grupo in REGIONES)
    .map((f) => ({ posicion: f.posicion, nombre: REGIONES[f.grupo as Region], puntos: f.puntos, esMio: f.grupo === mia }));
}

/** "Alejandro Cabrera" → "Alejandro C." */
const visible = (nombre: string) => {
  const [a, b] = nombre.trim().split(/\s+/).filter(Boolean);
  return !a ? "Ingeniero" : b ? `${a} ${b[0]!.toUpperCase()}.` : a;
};

function cierraEn(semana: string) {
  // Next Monday 00:00 in Lima (UTC−5).
  const fin = Date.parse(`${sumarDias(semana, 7)}T05:00:00Z`);
  const min = Math.max(0, Math.floor((fin - Date.now()) / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  return d > 0 ? `${d} d ${h} h` : `${h} h ${min % 60} min`;
}

export async function estadoLiga(userId: string): Promise<EstadoLiga> {
  const hoy = fechaLima();
  const semana = semanaDe(hoy);
  const division = await asegurarMembresia(db, userId, semana);
  const [yo] = await db.select({ university: users.university, region: users.region }).from(users).where(eq(users.id, userId));

  const filas = await tablaDivision(db, semana, division);
  const miIndice = filas.findIndex((f) => f.userId === userId);
  const { suben, bajan } = movimientos(filas.length);
  // Top 50 plus me if I'm further down.
  const visibles = filas.map((f, i) => ({ f, i })).filter(({ i }) => i < 50 || i === miIndice);
  const tabla = visibles.map(({ f, i }) => ({ posicion: i + 1, nombre: visible(f.nombre), puntos: f.puntos, soyYo: f.userId === userId }));

  const [{ total = 0 } = {}] = await db
    .select({ total: sql<number>`coalesce(sum(${xpEvents.points}), 0)::int` })
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId));
  const [{ hoyPuntos = 0 } = {}] = await db
    .select({ hoyPuntos: sql<number>`coalesce(sum(${xpEvents.points}), 0)::int` })
    .from(xpEvents)
    .where(and(eq(xpEvents.userId, userId), eq(xpEvents.day, hoy)));
  const titulo = tituloDe(total);

  const universidades = yo?.university ? await rankingUniversidades(semana, yo.university) : [];
  const regiones = yo?.region ? await rankingRegiones(semana, yo.region) : [];

  const [previa] = await db
    .select({ division: leagueMemberships.division })
    .from(leagueMemberships)
    .where(and(eq(leagueMemberships.userId, userId), eq(leagueMemberships.week, sumarDias(semana, -7))));
  const nivel = (d: Division) => DIVISIONES.findIndex((x) => x.codigo === d);
  const cambioDivision = !previa ? null : nivel(division) > nivel(previa.division) ? "subio" : nivel(division) < nivel(previa.division) ? "bajo" : "igual";

  return {
    semana,
    cierraEn: cierraEn(semana),
    division,
    tabla,
    miPosicion: miIndice + 1,
    misPuntosSemana: filas[miIndice]?.puntos ?? 0,
    suben,
    bajan,
    puntosTotales: total,
    titulo: titulo.actual,
    siguienteTitulo: titulo.siguiente ? { nombre: titulo.siguiente.nombre, desde: titulo.siguiente.desde } : null,
    puntosHoy: hoyPuntos,
    topeDiario: TOPES.total,
    universidad: (yo?.university as Universidad | null) ?? null,
    region: (yo?.region as Region | null) ?? null,
    miUniversidad: universidades.find((u) => u.esMio) ?? null,
    miRegion: regiones.find((r) => r.esMio) ?? null,
    cambioDivision,
  };
}

export async function guardarAfiliacion(userId: string, datos: { universidad?: Universidad | null; region?: Region | null }) {
  const cambios: Partial<typeof users.$inferInsert> = {};
  if (datos.universidad !== undefined) cambios.university = datos.universidad;
  if (datos.region !== undefined) cambios.region = datos.region;
  if (Object.keys(cambios).length) await db.update(users).set(cambios).where(eq(users.id, userId));
}

