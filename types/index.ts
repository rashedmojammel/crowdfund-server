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

// Credit rates: 10 credits = $1 when buying, 20 credits = $1 when withdrawing.
export const CREDITS_PER_USD_BUY = 10;
export const CREDITS_PER_USD_WITHDRAW = 20;
export const MIN_WITHDRAWAL_CREDITS = 200;
