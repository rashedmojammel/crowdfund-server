import { makeCampaignStatusRoute } from "@/lib/campaigns";

// PATCH — admin rejects a pending campaign.
export const PATCH = makeCampaignStatusRoute(
  "rejected",
  (title) => `Your campaign "${title}" was rejected.`
);
