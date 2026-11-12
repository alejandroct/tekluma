import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { contenidoTarjetaSchema, DECK_ACCESS, DISCIPLINES, importacionSchema, STAFF_ROLES, type StaffRole } from "@tekluma/shared";
import { auth } from "../auth";
import { db } from "../db/client";
import { articles, cardCitations, cards, deckReleases, decks, editorialReviews, standards, standardVersions, users } from "../db/schema";
import { publicarMazo } from "../publicacion";
import { eliminarMazo, eliminarNorma } from "../eliminacion";
import { compararNumeros } from "../util";
import { importar, ImportacionError } from "../importacion";

type StaffVars = { Variables: { usuarioId: string; rol: StaffRole } };

/** Emails promoted to admin on first access (ADMIN_EMAILS secret); bootstraps the first admin. */
const adminsIniciales = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Requires a session from a member of the editorial team; optionally a minimum role. */
const requiereStaff = (...roles: StaffRole[]) =>
  createMiddleware<StaffVars>(async (c, next) => {
    const sesion = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!sesion) throw new HTTPException(401, { message: "No autenticado" });
    const [usuario] = await db.select({ staffRole: users.staffRole, email: users.email }).from(users).where(eq(users.id, sesion.user.id));
    let rol = usuario?.staffRole ?? null;
    if (!rol && usuario && adminsIniciales.includes(usuario.email.toLowerCase())) {
      await db.update(users).set({ staffRole: "admin" }).where(eq(users.id, sesion.user.id));
      rol = "admin";
    }
    if (!rol) throw new HTTPException(403, { message: "Tu cuenta no pertenece al equipo editorial" });
    if (roles.length && !roles.includes(rol) && rol !== "admin") throw new HTTPException(403, { message: "No tienes permiso para esta acción" });
    c.set("usuarioId", sesion.user.id);
    c.set("rol", rol);
    return next();
  });

const nombreSchema = z.string().trim().min(2, "Escribe al menos 2 caracteres").max(80, "Máximo 80 caracteres");

const citasSchema = z.array(z.object({ articleId: z.uuid(), excerpt: z.string().min(1) })).min(1, "Cita al menos un artículo");
const tarjetaSchema = z.object({ content: contenidoTarjetaSchema, citations: citasSchema });

async function tarjetaDe(id: string) {
  const [tarjeta] = await db.select().from(cards).where(eq(cards.id, id));
  if (!tarjeta) throw new HTTPException(404, { message: "Tarjeta no encontrada" });
  return tarjeta;
}

async function guardarCitas(cardId: string, citas: z.infer<typeof citasSchema>) {
  await db.delete(cardCitations).where(eq(cardCitations.cardId, cardId));
  await db.insert(cardCitations).values(citas.map((c) => ({ cardId, articleId: c.articleId, excerpt: c.excerpt })));
}

export const editorial = new Hono<StaffVars>()
  .use(requiereStaff())

  .get("/yo", async (c) => {
    const [yo] = await db.select({ id: users.id, email: users.email, name: users.name }).from(users).where(eq(users.id, c.get("usuarioId")));
    return c.json({ ...yo, rol: c.get("rol") });
  })

  /** Any team member can change their own display name. */
  .put("/yo", zValidator("json", z.object({ name: nombreSchema })), async (c) => {
    await db.update(users).set({ name: c.req.valid("json").name }).where(eq(users.id, c.get("usuarioId")));
    return c.json({ ok: true });
  })

  // ───────── Standards and articles ─────────

  .get("/normas", async (c) => {
    const filas = await db
      .select({
        id: standards.id,
        code: standards.code,
        title: standards.title,
        discipline: standards.discipline,
        versionId: standardVersions.id,
        decree: standardVersions.decree,
        articleCount: sql<number>`(select count(*)::int from ${articles} where ${articles.standardVersionId} = ${standardVersions.id})`,
      })
      .from(standards)
      .leftJoin(standardVersions, and(eq(standardVersions.standardId, standards.id), eq(standardVersions.isCurrent, true)))
      .orderBy(standards.code);
    return c.json(filas);
  })

  .post(
    "/normas",
    requiereStaff("admin"),
    zValidator(
      "json",
      z.object({ code: z.string().min(1), title: z.string().min(1), discipline: z.enum(DISCIPLINES), decree: z.string().min(1), publishedAt: z.iso.date() }),
    ),
    async (c) => {
      const datos = c.req.valid("json");
      const [norma] = await db.insert(standards).values({ code: datos.code, title: datos.title, discipline: datos.discipline }).returning();
      await db.insert(standardVersions).values({ standardId: norma!.id, decree: datos.decree, publishedAt: new Date(datos.publishedAt), isCurrent: true });
      return c.json(norma, 201);
    },
  )

  /** Permanently deletes a standard without decks (see eliminarNorma). The code must be sent back as confirmation. */
  .delete("/normas/:id", requiereStaff("admin"), zValidator("json", z.object({ confirmar: z.string() })), async (c) => {
    const [norma] = await db.select({ code: standards.code }).from(standards).where(eq(standards.id, c.req.param("id")));
    if (!norma) throw new HTTPException(404, { message: "Norma no encontrada" });
    if (c.req.valid("json").confirmar.trim().toUpperCase() !== norma.code.toUpperCase())
      throw new HTTPException(400, { message: "El texto de confirmación no coincide con el código de la norma" });
    const resultado = await eliminarNorma(c.req.param("id"));
    if (resultado && "bloqueo" in resultado) throw new HTTPException(409, { message: resultado.bloqueo });
    return c.json(resultado);
  })

  .get("/normas/:id/articulos", async (c) => {
    const filas = await db
      .select({ id: articles.id, number: articles.number, heading: articles.heading, body: articles.body, sourcePage: articles.sourcePage })
      .from(articles)
      .innerJoin(standardVersions, eq(standardVersions.id, articles.standardVersionId))
      .where(and(eq(standardVersions.standardId, c.req.param("id")), eq(standardVersions.isCurrent, true)));
    return c.json(filas.sort((x, y) => compararNumeros(x.number, y.number)));
  })

  .post(
    "/normas/:id/articulos",
    requiereStaff("admin"),
    zValidator("json", z.object({ number: z.string().min(1), heading: z.string().optional(), body: z.string().min(1) })),
    async (c) => {
      const [version] = await db
        .select({ id: standardVersions.id })
        .from(standardVersions)
        .where(and(eq(standardVersions.standardId, c.req.param("id")), eq(standardVersions.isCurrent, true)));
      if (!version) throw new HTTPException(404, { message: "La norma no tiene versión vigente" });
      const [articulo] = await db
        .insert(articles)
        .values({ ...c.req.valid("json"), standardVersionId: version.id })
        .returning();
      return c.json(articulo, 201);
    },
  )

  // ───────── Decks ─────────

  .get("/mazos", async (c) => {
    const filas = await db
      .select({
        id: decks.id,
        slug: decks.slug,
        title: decks.title,
        access: decks.access,
        standardId: decks.standardId,
        standardCode: standards.code,
        version: sql<number | null>`(select max(${deckReleases.version}) from ${deckReleases} where ${deckReleases.deckId} = ${decks.id})`,
      })
      .from(decks)
      .innerJoin(standards, eq(standards.id, decks.standardId))
      .orderBy(decks.sortOrder, decks.title);
    const conteos = await db.select({ deckId: cards.deckId, status: cards.status, n: count() }).from(cards).groupBy(cards.deckId, cards.status);
    return c.json(
      filas.map((m) => ({
        ...m,
        counts: Object.fromEntries(conteos.filter((k) => k.deckId === m.id).map((k) => [k.status, k.n])),
      })),
    );
  })

  .post(
    "/mazos",
    requiereStaff("admin"),
    zValidator(
      "json",
      z.object({
        slug: z.string().regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
        title: z.string().min(1),
        description: z.string().default(""),
        standardId: z.uuid(),
        access: z.enum(DECK_ACCESS).default("free"),
      }),
    ),
    async (c) => {
      const [mazo] = await db.insert(decks).values(c.req.valid("json")).returning();
      return c.json(mazo, 201);
    },
  )

  /** Permanently deletes a deck (see eliminarMazo). The slug must be sent back as confirmation. */
  .delete("/mazos/:id", requiereStaff("admin"), zValidator("json", z.object({ confirmar: z.string() })), async (c) => {
    const [mazo] = await db.select({ id: decks.id, slug: decks.slug }).from(decks).where(eq(decks.id, c.req.param("id")));
    if (!mazo) throw new HTTPException(404, { message: "Mazo no encontrado" });
    if (c.req.valid("json").confirmar !== mazo.slug) throw new HTTPException(400, { message: "El texto de confirmación no coincide con el identificador del mazo" });

    return c.json(await eliminarMazo(mazo.id));
  })

  /** Without `tarjetas`, publishes every approved card; with it, only those (plus the already published). */
  .post("/mazos/:id/publicar", requiereStaff("reviewer"), zValidator("json", z.object({ tarjetas: z.array(z.uuid()).max(2000).optional() })), async (c) => {
    try {
      return c.json(await publicarMazo(c.req.param("id"), c.get("usuarioId"), c.req.valid("json").tarjetas));
    } catch (e) {
      throw new HTTPException(400, { message: (e as Error).message });
    }
  })

  // ───────── Cards and editorial flow ─────────

  .get("/mazos/:id/tarjetas", async (c) => {
    const filas = await db
      .select({
        id: cards.id,
        content: cards.content,
        status: cards.status,
        revision: cards.revision,
        authorId: cards.authorId,
        authorName: users.name,
        updatedAt: cards.updatedAt,
      })
      .from(cards)
      .innerJoin(users, eq(users.id, cards.authorId))
      .where(eq(cards.deckId, c.req.param("id")))
      .orderBy(cards.createdAt);
    const citas = filas.length
      ? await db
          .select({ cardId: cardCitations.cardId, articleId: cardCitations.articleId, excerpt: cardCitations.excerpt, number: articles.number })
          .from(cardCitations)
          .innerJoin(articles, eq(articles.id, cardCitations.articleId))
          .where(inArray(cardCitations.cardId, filas.map((f) => f.id)))
      : [];
    const ultimas = filas.length
      ? await db
          .selectDistinctOn([editorialReviews.cardId], { cardId: editorialReviews.cardId, approved: editorialReviews.approved, comment: editorialReviews.comment })
          .from(editorialReviews)
          .where(inArray(editorialReviews.cardId, filas.map((f) => f.id)))
          .orderBy(editorialReviews.cardId, desc(editorialReviews.createdAt))
      : [];
    return c.json(
      filas.map((f) => ({
        ...f,
        citations: citas.filter((x) => x.cardId === f.id),
        lastReview: ultimas.find((r) => r.cardId === f.id) ?? null,
      })),
    );
  })

  .post("/mazos/:id/tarjetas", zValidator("json", tarjetaSchema), async (c) => {
    const { content, citations } = c.req.valid("json");
    const [tarjeta] = await db.insert(cards).values({ deckId: c.req.param("id"), content, authorId: c.get("usuarioId") }).returning();
    await guardarCitas(tarjeta!.id, citations);
    return c.json(tarjeta, 201);
  })

  /** Editing a card sends it back to draft; published packages are immutable until republished. */
  .put("/tarjetas/:id", zValidator("json", tarjetaSchema), async (c) => {
    const tarjeta = await tarjetaDe(c.req.param("id"));
    if (tarjeta.status === "in_review") throw new HTTPException(409, { message: "La tarjeta está en revisión" });
    const { content, citations } = c.req.valid("json");
    await db
      .update(cards)
      .set({ content, status: "draft", revision: tarjeta.status === "draft" ? tarjeta.revision : tarjeta.revision + 1, updatedAt: new Date() })
      .where(eq(cards.id, tarjeta.id));
    await guardarCitas(tarjeta.id, citations);
    return c.json({ ok: true });
  })

  .post("/tarjetas/:id/enviar", async (c) => {
    const tarjeta = await tarjetaDe(c.req.param("id"));
    if (tarjeta.status !== "draft") throw new HTTPException(409, { message: "Solo se envían borradores" });
    await db.update(cards).set({ status: "in_review", updatedAt: new Date() }).where(eq(cards.id, tarjeta.id));
    return c.json({ ok: true });
  })

  .post(
    "/tarjetas/:id/revisar",
    requiereStaff("reviewer"),
    zValidator("json", z.object({ approved: z.boolean(), comment: z.string().optional() })),
    async (c) => {
      const tarjeta = await tarjetaDe(c.req.param("id"));
      if (tarjeta.status !== "in_review") throw new HTTPException(409, { message: "La tarjeta no está en revisión" });
      if (tarjeta.authorId === c.get("usuarioId")) throw new HTTPException(403, { message: "No puedes revisar tus propias tarjetas" });
      const { approved, comment } = c.req.valid("json");
      if (!approved && !comment?.trim()) throw new HTTPException(400, { message: "Explica qué corregir al rechazar" });
      await db.insert(editorialReviews).values({ cardId: tarjeta.id, reviewerId: c.get("usuarioId"), approved, comment });
      await db
        .update(cards)
        .set({ status: approved ? "approved" : "draft", reviewerId: c.get("usuarioId"), updatedAt: new Date() })
        .where(eq(cards.id, tarjeta.id));
      return c.json({ ok: true });
    },
  )

  /**
   * Same editorial steps as above, for many cards at once. Cards in the wrong state are skipped and
   * reported. Admins may approve their own cards here, as they already can when importing.
   */
  .post(
    "/tarjetas/lote",
    zValidator(
      "json",
      z
        .object({
          ids: z.array(z.uuid()).max(2000).optional(),
          /** Instead of ids: every card of these decks (only those in the right state are touched). */
          mazos: z.array(z.uuid()).max(200).optional(),
          accion: z.enum(["enviar", "aprobar", "rechazar"]),
          comment: z.string().optional(),
        })
        .refine((b) => b.ids?.length || b.mazos?.length, "Elige tarjetas o mazos"),
    ),
    async (c) => {
      const { ids, mazos, accion, comment } = c.req.valid("json");
      const yo = c.get("usuarioId");
      const rol = c.get("rol");
      if (accion !== "enviar" && rol === "author") throw new HTTPException(403, { message: "No tienes permiso para esta acción" });
      if (accion === "rechazar" && !comment?.trim()) throw new HTTPException(400, { message: "Explica qué corregir al rechazar" });

      const filas = await db
        .select({ id: cards.id, status: cards.status, authorId: cards.authorId })
        .from(cards)
        .where(mazos?.length ? inArray(cards.deckId, mazos) : inArray(cards.id, ids!));
      const requerido = accion === "enviar" ? "draft" : "in_review";
      const omitidas: { id: string; motivo: string }[] = [];
      const validas = filas.filter((t) => {
        if (t.status !== requerido) return omitidas.push({ id: t.id, motivo: accion === "enviar" ? "no es borrador" : "no está en revisión" }), false;
        if (accion !== "enviar" && t.authorId === yo && rol !== "admin") return omitidas.push({ id: t.id, motivo: "es tuya" }), false;
        return true;
      });
      const idsValidos = validas.map((t) => t.id);
      if (idsValidos.length) {
        await db.transaction(async (tx) => {
          if (accion === "enviar") {
            await tx.update(cards).set({ status: "in_review", updatedAt: new Date() }).where(inArray(cards.id, idsValidos));
            return;
          }
          const approved = accion === "aprobar";
          await tx.insert(editorialReviews).values(idsValidos.map((cardId) => ({ cardId, reviewerId: yo, approved, comment: comment?.trim() || (approved ? "Aprobada en lote" : undefined) })));
          await tx
            .update(cards)
            .set({ status: approved ? "approved" : "draft", reviewerId: yo, updatedAt: new Date() })
            .where(inArray(cards.id, idsValidos));
        });
      }
      return c.json({ procesadas: idsValidos.length, omitidas });
    },
  )

  // ───────── Bulk import ─────────

  /**
   * One file per chapter. Cards enter "in review" by default; an admin may approve them on import
   * (recorded as a signed review), e.g. when the content was already checked outside the panel.
   */
  .post(
    "/importar",
    requiereStaff("admin"),
    zValidator("json", z.object({ archivo: importacionSchema, estado: z.enum(["in_review", "draft", "approved"]).default("in_review") })),
    async (c) => {
      const { archivo, estado } = c.req.valid("json");
      try {
        return c.json(await importar(archivo, c.get("usuarioId"), estado));
      } catch (e) {
        if (e instanceof ImportacionError) throw new HTTPException(400, { message: e.message });
        throw e;
      }
    },
  )

  // ───────── Team ─────────

  .get("/equipo", requiereStaff("admin"), async (c) =>
    c.json(
      await db
        .select({ id: users.id, email: users.email, name: users.name, staffRole: users.staffRole })
        .from(users)
        .where(sql`${users.staffRole} is not null`)
        .orderBy(users.email),
    ),
  )

  /** An admin can fix a member's display name (e.g. someone who signed in only on the panel). */
  .put("/equipo/:id", requiereStaff("admin"), zValidator("json", z.object({ name: nombreSchema })), async (c) => {
    const [actualizado] = await db
      .update(users)
      .set({ name: c.req.valid("json").name })
      .where(and(eq(users.id, c.req.param("id")), sql`${users.staffRole} is not null`))
      .returning({ id: users.id });
    if (!actualizado) throw new HTTPException(404, { message: "Esa persona no pertenece al equipo" });
    return c.json({ ok: true });
  })

  /** The person must have signed in at least once (app or panel). */
  .post(
    "/equipo",
    requiereStaff("admin"),
    zValidator("json", z.object({ email: z.email(), staffRole: z.enum(STAFF_ROLES).nullable() })),
    async (c) => {
      const { email, staffRole } = c.req.valid("json");
      const [actualizado] = await db.update(users).set({ staffRole }).where(eq(users.email, email.toLowerCase())).returning({ id: users.id });
      if (!actualizado) throw new HTTPException(404, { message: "Esa persona aún no tiene cuenta: pídele que inicie sesión una vez" });
      return c.json({ ok: true });
    },
  );
