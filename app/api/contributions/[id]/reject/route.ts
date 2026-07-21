import { makeContributionReviewRoute } from "@/lib/contributions";

// PATCH — creator rejects a pending contribution to their own campaign:
// status → rejected, credits refunded, supporter notified.
export const PATCH = makeContributionReviewRoute("rejected");
