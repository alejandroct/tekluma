/** Peruvian building code (RNE) titles and other sources, grouped by audience. */
export const DISCIPLINES = [
  "urban_development", // GH, OS
  "architecture", // A.010 – A.140
  "structures", // E.020 – E.090
  "plumbing", // IS
  "electromechanical", // EM
  "general", // G.010 – G.050
] as const;
export type Discipline = (typeof DISCIPLINES)[number];

/** Editorial flow: author and reviewer must be different people. */
export const EDITORIAL_STATUSES = ["draft", "in_review", "approved", "published", "deprecated"] as const;
export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];

export const STAFF_ROLES = ["author", "reviewer", "admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Free decks count against the daily quota; premium decks require a subscription. */
export const DECK_ACCESS = ["free", "premium"] as const;
export type DeckAccess = (typeof DECK_ACCESS)[number];

export const COIN_REASONS = [
  "ad", // rewarded ad
  "purchase", // IAP coin pack
  "extra_cards", // spent to extend today's quota
  "check_in", // daily check-in reward
  "bonus", // referrals, welcome, promotions
  "adjustment", // manual support correction
] as const;
export type CoinReason = (typeof COIN_REASONS)[number];

/** Professions offered during onboarding. */
export const PROFESSIONS = [
  "civil_engineer",
  "architect",
  "electrical_engineer",
  "mechanical_engineer",
  "sanitary_engineer",
  "student",
  "other",
] as const;
export type Profession = (typeof PROFESSIONS)[number];
