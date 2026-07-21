import { makeCampaignStatusRoute } from "@/lib/campaigns";

// PATCH — admin suspends an approved campaign (reports resolution flow).
export const PATCH = makeCampaignStatusRoute(
  "suspended",
  (title) => `Your campaign "${title}" was suspended after review.`
);
