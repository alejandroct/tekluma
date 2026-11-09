import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  smallint,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import {
  ACCESOS_MAZO,
  DISCIPLINAS,
  ESTADOS_EDITORIALES,
  MOTIVOS_MONEDAS,
  ROLES_STAFF,
  type ContenidoTarjeta,
  type PaqueteMazo,
} from "@tekluma/shared";

const id = () => uuid("id").primaryKey().defaultRandom();
const creadoEn = () => timestamp("creado_en", { withTimezone: true }).notNull().defaultNow();

export const disciplinaEnum = pgEnum("disciplina", DISCIPLINAS);
export const estadoEditorialEnum = pgEnum("estado_editorial", ESTADOS_EDITORIALES);
export const rolStaffEnum = pgEnum("rol_staff", ROLES_STAFF);
export const accesoMazoEnum = pgEnum("acceso_mazo", ACCESOS_MAZO);
export const motivoMonedasEnum = pgEnum("motivo_monedas", MOTIVOS_MONEDAS);

// ───────────── Usuarios ─────────────

// Tablas gestionadas por Better Auth (ver src/auth.ts para el mapeo de campos).

export const usuarios = pgTable("usuarios", {
  id: id(),
  email: text("email").notNull().unique(),
  emailVerificado: boolean("email_verificado").notNull().default(false),
  nombre: text("nombre").notNull().default(""),
  imagen: text("imagen"),
  /** Profesión declarada: ingeniero civil, arquitecto, estudiante, etc. */
  profesion: text("profesion"),
  /** Si es parte del equipo editorial. */
  rolStaff: rolStaffEnum("rol_staff"),
  /** Fin de la suscripción vigente según RevenueCat (null = sin premium). */
  premiumHasta: timestamp("premium_hasta", { withTimezone: true }),
  creadoEn: creadoEn(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const sesiones = pgTable(
  "sesiones",
  {
    id: id(),
    userId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expira_en", { withTimezone: true }).notNull(),
    ipAddress: text("ip"),
    userAgent: text("user_agent"),
    createdAt: creadoEn(),
    updatedAt: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sesiones_usuario_idx").on(t.userId)],
);

/** Proveedores vinculados a un usuario (Apple, Google). */
export const cuentas = pgTable(
  "cuentas",
  {
    id: id(),
    userId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
    accountId: text("cuenta_proveedor_id").notNull(),
    providerId: text("proveedor").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expira_en", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expira_en", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: creadoEn(),
    updatedAt: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("cuentas_usuario_idx").on(t.userId)],
);

/** Códigos de un solo uso (OTP por correo) y estados de OAuth. */
export const verificaciones = pgTable(
  "verificaciones",
  {
    id: id(),
    identifier: text("identificador").notNull(),
    value: text("valor").notNull(),
    expiresAt: timestamp("expira_en", { withTimezone: true }).notNull(),
    createdAt: creadoEn(),
    updatedAt: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verificaciones_identificador_idx").on(t.identifier)],
);

// ───────────── Normativa ─────────────

export const normas = pgTable("normas", {
  id: id(),
  /** Ej. "E.030" */
  codigo: text("codigo").notNull().unique(),
  titulo: text("titulo").notNull(),
  disciplina: disciplinaEnum("disciplina").notNull(),
  creadoEn: creadoEn(),
});

/** Cada modificación oficial de una norma (DS, RM) es una versión. */
export const versionesNorma = pgTable(
  "versiones_norma",
  {
    id: id(),
    normaId: uuid("norma_id").notNull().references(() => normas.id),
    /** Ej. "DS 003-2016-VIVIENDA" */
    dispositivo: text("dispositivo").notNull(),
    publicadaEn: timestamp("publicada_en", { withTimezone: true }).notNull(),
    vigente: boolean("vigente").notNull().default(false),
    creadoEn: creadoEn(),
  },
  (t) => [index("versiones_norma_norma_idx").on(t.normaId)],
);

export const articulos = pgTable(
  "articulos",
  {
    id: id(),
    versionNormaId: uuid("version_norma_id").notNull().references(() => versionesNorma.id),
    /** Ej. "28.2" */
    numero: text("numero").notNull(),
    encabezado: text("encabezado"),
    texto: text("texto").notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex("articulos_version_numero_uq").on(t.versionNormaId, t.numero)],
);

// ───────────── Contenido editorial ─────────────

export const mazos = pgTable("mazos", {
  id: id(),
  slug: text("slug").notNull().unique(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion").notNull().default(""),
  normaId: uuid("norma_id").notNull().references(() => normas.id),
  acceso: accesoMazoEnum("acceso").notNull().default("premium"),
  precioMonedas: integer("precio_monedas"),
  orden: integer("orden").notNull().default(0),
  creadoEn: creadoEn(),
});

export const tarjetas = pgTable(
  "tarjetas",
  {
    id: id(),
    mazoId: uuid("mazo_id").notNull().references(() => mazos.id),
    /** Se incrementa en cada cambio aprobado; la app la usa para invalidar caché. */
    revision: integer("revision").notNull().default(1),
    contenido: jsonb("contenido").$type<ContenidoTarjeta>().notNull(),
    estado: estadoEditorialEnum("estado").notNull().default("borrador"),
    autorId: uuid("autor_id").notNull().references(() => usuarios.id),
    revisorId: uuid("revisor_id").references(() => usuarios.id),
    creadoEn: creadoEn(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tarjetas_mazo_estado_idx").on(t.mazoId, t.estado)],
);

/** Artículos que respaldan cada tarjeta; permite saber qué tarjetas afecta un cambio de norma. */
export const citasTarjeta = pgTable(
  "citas_tarjeta",
  {
    tarjetaId: uuid("tarjeta_id").notNull().references(() => tarjetas.id, { onDelete: "cascade" }),
    articuloId: uuid("articulo_id").notNull().references(() => articulos.id),
    extracto: text("extracto").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tarjetaId, t.articuloId] }), index("citas_articulo_idx").on(t.articuloId)],
);

/** Historial de decisiones de revisión. */
export const revisionesEditoriales = pgTable("revisiones_editoriales", {
  id: id(),
  tarjetaId: uuid("tarjeta_id").notNull().references(() => tarjetas.id, { onDelete: "cascade" }),
  revisorId: uuid("revisor_id").notNull().references(() => usuarios.id),
  aprobada: boolean("aprobada").notNull(),
  comentario: text("comentario"),
  creadoEn: creadoEn(),
});

/**
 * Versión publicada (inmutable) de un mazo. El paquete se guarda aquí y la API lo sirve;
 * al desplegar se copiará también a S3/CloudFront (`claveS3`) para descargas masivas.
 */
export const publicacionesMazo = pgTable(
  "publicaciones_mazo",
  {
    id: id(),
    mazoId: uuid("mazo_id").notNull().references(() => mazos.id),
    version: integer("version").notNull(),
    paquete: jsonb("paquete").$type<PaqueteMazo>().notNull(),
    claveS3: text("clave_s3"),
    totalTarjetas: integer("total_tarjetas").notNull(),
    publicadoPor: uuid("publicado_por").notNull().references(() => usuarios.id),
    publicadoEn: creadoEn(),
  },
  (t) => [uniqueIndex("publicaciones_mazo_version_uq").on(t.mazoId, t.version)],
);

// ───────────── Monetización ─────────────

/** Libro de movimientos: el saldo es la suma de `cantidad`. Nunca se edita, solo se agrega. */
export const movimientosMonedas = pgTable(
  "movimientos_monedas",
  {
    id: id(),
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
    cantidad: integer("cantidad").notNull(),
    motivo: motivoMonedasEnum("motivo").notNull(),
    /** Id externo para idempotencia (transacción de AdMob SSV, IAP, mazo desbloqueado). */
    referencia: text("referencia"),
    creadoEn: creadoEn(),
  },
  (t) => [
    index("movimientos_usuario_idx").on(t.usuarioId),
    uniqueIndex("movimientos_motivo_ref_uq").on(t.motivo, t.referencia),
  ],
);

export const desbloqueosMazo = pgTable(
  "desbloqueos_mazo",
  {
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
    mazoId: uuid("mazo_id").notNull().references(() => mazos.id),
    creadoEn: creadoEn(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.mazoId] })],
);

// ───────────── Progreso (FSRS) ─────────────

/** Copia en servidor del estado FSRS; la fuente primaria es la app (offline-first). */
export const estadosRepaso = pgTable(
  "estados_repaso",
  {
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
    tarjetaId: uuid("tarjeta_id").notNull().references(() => tarjetas.id),
    vence: timestamp("vence", { withTimezone: true }).notNull(),
    estabilidad: real("estabilidad").notNull(),
    dificultad: real("dificultad").notNull(),
    repeticiones: integer("repeticiones").notNull(),
    fallos: integer("fallos").notNull(),
    estado: smallint("estado").notNull(),
    ultimoRepaso: timestamp("ultimo_repaso", { withTimezone: true }),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.tarjetaId] }), index("estados_vence_idx").on(t.usuarioId, t.vence)],
);
