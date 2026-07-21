import { makeContributionReviewRoute } from "@/lib/contributions";

// PATCH — creator approves a pending contribution to their own campaign:
// status → approved, campaign.amountRaised += amount, supporter notified.
export const PATCH = makeContributionReviewRoute("approved");
