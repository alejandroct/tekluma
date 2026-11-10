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
} from "drizzle-orm/pg-core";
import {
  COIN_REASONS,
  DECK_ACCESS,
  DISCIPLINES,
  EDITORIAL_STATUSES,
  STAFF_ROLES,
  type ContenidoTarjeta,
  type PaqueteMazo,
} from "@tekluma/shared";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const disciplineEnum = pgEnum("discipline", DISCIPLINES);
export const editorialStatusEnum = pgEnum("editorial_status", EDITORIAL_STATUSES);
export const staffRoleEnum = pgEnum("staff_role", STAFF_ROLES);
export const deckAccessEnum = pgEnum("deck_access", DECK_ACCESS);
export const coinReasonEnum = pgEnum("coin_reason", COIN_REASONS);

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
