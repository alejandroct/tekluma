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
  date,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";
import {
  COIN_REASONS,
  DECK_ACCESS,
  DISCIPLINES,
  EDITORIAL_STATUSES,
  DIVISIONES,
  STAFF_ROLES,
  XP_SOURCES,
  type ContenidoTarjeta,
  type Division,
  type EventoEmbudo,
  type PaqueteMazo,
  type EstadoReclamo,
  type TipoReclamo,
} from "@tekluma/shared";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const disciplineEnum = pgEnum("discipline", DISCIPLINES);
export const editorialStatusEnum = pgEnum("editorial_status", EDITORIAL_STATUSES);
export const staffRoleEnum = pgEnum("staff_role", STAFF_ROLES);
export const deckAccessEnum = pgEnum("deck_access", DECK_ACCESS);
export const coinReasonEnum = pgEnum("coin_reason", COIN_REASONS);
export const xpSourceEnum = pgEnum("xp_source", XP_SOURCES);
export const divisionEnum = pgEnum(
  "division",
  DIVISIONES.map((d) => d.codigo) as [Division, ...Division[]],
);

// ───────────── Users (tables managed by Better Auth, see src/auth.ts) ─────────────

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull().default(""),
  image: text("image"),
  /** Declared profession: civil engineer, architect, student, etc. */
  profession: text("profession"),
  /** Editorial team role (null for regular users). */
  staffRole: staffRoleEnum("staff_role"),
  /** End of the current subscription according to RevenueCat (null = not premium). */
  premiumUntil: timestamp("premium_until", { withTimezone: true }),
  /** League affiliation (codes from @tekluma/shared UNIVERSIDADES / REGIONES). */
  university: text("university"),
  region: text("region"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Linked identity providers (Apple, Google). */
export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

/** One-time codes (email OTP) and OAuth state. */
export const verifications = pgTable(
  "verifications",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

// ───────────── Building codes ─────────────

export const standards = pgTable("standards", {
  id: id(),
  /** e.g. "E.030" */
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  discipline: disciplineEnum("discipline").notNull(),
  createdAt: createdAt(),
});

/** Each official amendment of a standard (DS, RM) is a version. */
export const standardVersions = pgTable(
  "standard_versions",
  {
    id: id(),
    standardId: uuid("standard_id").notNull().references(() => standards.id),
    /** e.g. "DS 003-2016-VIVIENDA" */
    decree: text("decree").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("standard_versions_standard_idx").on(t.standardId)],
);

export const articles = pgTable(
  "articles",
  {
    id: id(),
    standardVersionId: uuid("standard_version_id").notNull().references(() => standardVersions.id),
    /** e.g. "28.2" */
    number: text("number").notNull(),
    heading: text("heading"),
    body: text("body").notNull(),
    /** Page in the official document (PDF) where the article appears, so users can check the source. */
    sourcePage: integer("source_page"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("articles_version_number_uq").on(t.standardVersionId, t.number)],
);

// ───────────── Editorial content ─────────────

export const decks = pgTable("decks", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  standardId: uuid("standard_id").notNull().references(() => standards.id),
  access: deckAccessEnum("access").notNull().default("free"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const cards = pgTable(
  "cards",
  {
    id: id(),
    deckId: uuid("deck_id").notNull().references(() => decks.id),
    /** Bumped on every approved change; the app uses it to invalidate its cache. */
    revision: integer("revision").notNull().default(1),
    content: jsonb("content").$type<ContenidoTarjeta>().notNull(),
    status: editorialStatusEnum("status").notNull().default("draft"),
    authorId: uuid("author_id").notNull().references(() => users.id),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("cards_deck_status_idx").on(t.deckId, t.status)],
);

/** Articles backing each card; tells which cards a standard amendment affects. */
export const cardCitations = pgTable(
  "card_citations",
  {
    cardId: uuid("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
    articleId: uuid("article_id").notNull().references(() => articles.id),
    excerpt: text("excerpt").notNull(),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.articleId] }), index("card_citations_article_idx").on(t.articleId)],
);

/** History of review decisions. */
export const editorialReviews = pgTable("editorial_reviews", {
  id: id(),
  cardId: uuid("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id),
  approved: boolean("approved").notNull(),
  comment: text("comment"),
  createdAt: createdAt(),
});

/**
 * Published (immutable) version of a deck. The package is stored here and served by the API;
 * `s3Key` is reserved for copying it to S3/CloudFront later.
 */
export const deckReleases = pgTable(
  "deck_releases",
  {
    id: id(),
    deckId: uuid("deck_id").notNull().references(() => decks.id),
    version: integer("version").notNull(),
    package: jsonb("package").$type<PaqueteMazo>().notNull(),
    s3Key: text("s3_key"),
    cardCount: integer("card_count").notNull(),
    publishedBy: uuid("published_by").notNull().references(() => users.id),
    publishedAt: createdAt(),
  },
  (t) => [uniqueIndex("deck_releases_version_uq").on(t.deckId, t.version)],
);

// ───────────── Monetization ─────────────

/** Append-only ledger: the balance is the sum of `amount`. */
export const coinTransactions = pgTable(
  "coin_transactions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: coinReasonEnum("reason").notNull(),
    /** External id for idempotency (AdMob transaction, IAP, check-in date). */
    reference: text("reference"),
    createdAt: createdAt(),
  },
  (t) => [index("coin_transactions_user_idx").on(t.userId), uniqueIndex("coin_transactions_reason_ref_uq").on(t.reason, t.reference)],
);

/** Daily quota usage per user (date in Lima time). */
export const dailyQuotas = pgTable(
  "daily_quotas",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    /** Cards added to the base quota with ads or coins. */
    extraCards: integer("extra_cards").notNull().default(0),
    /** Rewarded ads watched for cards. */
    cardAds: integer("card_ads").notNull().default(0),
    /** Rewarded ads watched for coins. */
    coinAds: integer("coin_ads").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

/** Distinct cards seen per day: repeating a card the same day does not use quota. */
export const dailyCardViews = pgTable(
  "daily_card_views",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    cardId: uuid("card_id").notNull().references(() => cards.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day, t.cardId] })],
);

/** Rewarded ads already credited (idempotency by AdMob transaction). */
export const adRewards = pgTable("ad_rewards", {
  transactionId: text("transaction_id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  createdAt: createdAt(),
});

// ───────────── Daily question ─────────────

/** One multiple-choice card per Lima day, the same for everyone. */
export const dailyQuestions = pgTable("daily_questions", {
  day: date("day").primaryKey(),
  number: integer("number").notNull().unique(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id),
  createdAt: createdAt(),
});

/** A user's guesses, stored one by one so a wrong answer cannot be retried. */
export const dailyAnswers = pgTable(
  "daily_answers",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    guesses: jsonb("guesses").$type<number[]>().notNull().default([]),
    solved: boolean("solved").notNull().default(false),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

// ───────────── Duels ─────────────

/** A 1 vs 1 challenge shared by link: fixed questions, anyone with the code can play once. */
export const duels = pgTable("duels", {
  id: id(),
  code: text("code").notNull().unique(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  standardCode: text("standard_code").notNull(),
  cardIds: jsonb("card_ids").$type<string[]>().notNull(),
  createdAt: createdAt(),
});

/** One play of a duel; players from the web have no account, only a display name. */
export const duelPlays = pgTable(
  "duel_plays",
  {
    id: id(),
    duelId: uuid("duel_id")
      .notNull()
      .references(() => duels.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    answers: jsonb("answers").$type<(number | null)[]>().notNull(),
    correct: integer("correct").notNull(),
    seconds: real("seconds").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("duel_plays_duel_idx").on(t.duelId), uniqueIndex("duel_plays_user_uq").on(t.duelId, t.userId)],
);

// ───────────── Leagues ─────────────

/** "Puntos de obra" ledger; the reference makes each award idempotent. */
export const xpEvents = pgTable(
  "xp_events",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    source: xpSourceEnum("source").notNull(),
    reference: text("reference").notNull(),
    points: integer("points").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("xp_events_user_day_idx").on(t.userId, t.day), index("xp_events_day_idx").on(t.day), uniqueIndex("xp_events_ref_uq").on(t.source, t.reference)],
);

/** Division of each user per week (Monday in Lima), decided when the week starts for them. */
export const leagueMemberships = pgTable(
  "league_memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    week: date("week").notNull(),
    division: divisionEnum("division").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.week] }), index("league_memberships_week_idx").on(t.week, t.division)],
);

// ───────────── Progress (FSRS) ─────────────

/** Server copy of the FSRS state; the app is the primary source (offline-first). */
export const reviewStates = pgTable(
  "review_states",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    cardId: uuid("card_id").notNull().references(() => cards.id),
    due: timestamp("due", { withTimezone: true }).notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    reps: integer("reps").notNull(),
    lapses: integer("lapses").notNull(),
    state: smallint("state").notNull(),
    lastReview: timestamp("last_review", { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.cardId] }), index("review_states_due_idx").on(t.userId, t.due)],
);

// ───────────── Complaints book (Libro de Reclamaciones) ─────────────

/** One sheet of the virtual complaints book; kept at least two years as the law requires. */
export const complaints = pgTable(
  "complaints",
  {
    id: id(),
    /** Correlative sheet number, shown as 000001-2026. */
    number: serial("number").notNull().unique(),
    kind: text("kind").$type<TipoReclamo>().notNull(),
    name: text("name").notNull(),
    documentType: text("document_type").notNull(),
    documentNumber: text("document_number").notNull(),
    address: text("address").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    isMinor: boolean("is_minor").notNull().default(false),
    guardian: text("guardian"),
    itemType: text("item_type").notNull(),
    itemDescription: text("item_description").notNull(),
    /** Amount claimed in céntimos (PEN), if any. */
    amountCents: integer("amount_cents"),
    detail: text("detail").notNull(),
    request: text("request").notNull(),
    status: text("status").$type<EstadoReclamo>().notNull().default("pendiente"),
    /** Last day to answer: 15 business days after filing. */
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    /** When the receipt reached the consumer by email (null = SES failed; resend by hand). */
    receiptSentAt: timestamp("receipt_sent_at", { withTimezone: true }),
    response: text("response"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    respondedBy: uuid("responded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("complaints_created_idx").on(t.createdAt)],
);

// ───────────── Support actions (admin panel) ─────────────

/** Audit log of what an admin gave or removed from a user by hand (coins, Premium). */
export const supportActions = pgTable(
  "support_actions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").$type<"monedas" | "premium" | "quitar_premium">().notNull(),
    /** Coins given (negative = removed). */
    coins: integer("coins"),
    /** Premium granted until this moment. */
    premiumUntil: timestamp("premium_until", { withTimezone: true }),
    note: text("note").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("support_actions_user_idx").on(t.userId)],
);

// ───────────── Activation funnel ─────────────

/** First time each install reached each app-side funnel step (one row per install and event). */
export const installEvents = pgTable(
  "install_events",
  {
    installId: uuid("install_id").notNull(),
    event: text("event").$type<EventoEmbudo>().notNull(),
    /** Set once the install signs in, so later steps can be read from the user's data. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    platform: text("platform").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.installId, t.event] }), index("install_events_created_idx").on(t.event, t.createdAt), index("install_events_user_idx").on(t.userId)],
);

// ───────────── Mock exams ─────────────

/** A timed practice exam: questions fixed at the start, answers scored on submission. */
export const mockExams = pgTable(
  "mock_exams",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    standardCode: text("standard_code").notNull(),
    cardIds: jsonb("card_ids").$type<string[]>().notNull(),
    timeLimitSec: integer("time_limit_sec").notNull(),
    answers: jsonb("answers").$type<(number | null)[]>(),
    correct: integer("correct"),
    seconds: integer("seconds"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("mock_exams_user_idx").on(t.userId, t.createdAt)],
);
