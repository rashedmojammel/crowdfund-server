import { makeCampaignStatusRoute } from "@/lib/campaigns";

// PATCH — admin approves a pending (or reinstates a suspended) campaign.
export const PATCH = makeCampaignStatusRoute(
  "approved",
  (title) => `Your campaign "${title}" was approved.`
);
