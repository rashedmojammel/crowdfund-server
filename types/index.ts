export const USER_ROLES = ["supporter", "creator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SIGNUP_BONUS: Partial<Record<UserRole, number>> = {
  supporter: 50,
  creator: 20,
};

export const CAMPAIGN_CATEGORIES = [
  "technology",
  "art",
  "education",
  "health",
  "community",
  "environment",
] as const;
export type CampaignCategory = (typeof CAMPAIGN_CATEGORIES)[number];

export const CAMPAIGN_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

// Admin status transitions: target status → statuses it may come from.
// Same-status calls are idempotent no-ops; anything else is a 409.
export const CAMPAIGN_STATUS_TRANSITIONS: Record<
  "approved" | "rejected" | "suspended",
  readonly CampaignStatus[]
> = {
  approved: ["pending", "suspended"],
  rejected: ["pending"],
  suspended: ["approved"],
};

export const CONTRIBUTION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

export const WITHDRAWAL_STATUSES = ["pending", "approved"] as const;
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const PAYMENT_SYSTEMS = ["bkash", "nagad", "rocket", "bank"] as const;
export type PaymentSystem = (typeof PAYMENT_SYSTEMS)[number];

// Credit rates: 10 credits = $1 when buying, 20 credits = $1 when withdrawing.
export const CREDITS_PER_USD_BUY = 10;
export const CREDITS_PER_USD_WITHDRAW = 20;
export const MIN_WITHDRAWAL_CREDITS = 200;

// The only four purchasable packages. POST /api/payments rejects any
// {credits, amountUsd} pair that doesn't exactly match one of these —
// larger packages carry a bulk discount over the base 10-credits-per-$1 rate.
export const CREDIT_PACKAGES = [
  { credits: 100, amountUsd: 10 },
  { credits: 300, amountUsd: 25 },
  { credits: 800, amountUsd: 60 },
  { credits: 1500, amountUsd: 110 },
] as const;
