import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { Campaign, type CampaignDoc } from "@/lib/models/Campaign";
import { CAMPAIGN_STATUS_TRANSITIONS } from "@/types";

export type AdminCampaignStatus = keyof typeof CAMPAIGN_STATUS_TRANSITIONS;

export interface StatusChangeResult {
  campaign: CampaignDoc;
  changed: boolean;
}

// Idempotent admin status transition. Runs in a transaction so the status
// write and anything tied to it commit or roll back together. A campaign
// already in the target status is a no-op; an invalid source status
// (e.g. approving a rejected campaign) is a 409.
export async function setCampaignStatus(
  id: string,
  status: AdminCampaignStatus
): Promise<StatusChangeResult> {
  await connectDb();

  return runInTransaction(async (session) => {
    const campaign = await Campaign.findById(id).session(session);
    if (!campaign) throw new ApiError(404, "Campaign not found");

    if (campaign.status === status) {
      return { campaign: campaign.toObject(), changed: false };
    }

    if (!CAMPAIGN_STATUS_TRANSITIONS[status].includes(campaign.status)) {
      throw new ApiError(
        409,
        `Cannot mark a ${campaign.status} campaign as ${status}`
      );
    }

    campaign.status = status;
    await campaign.save({ session });

    return { campaign: campaign.toObject(), changed: true };
  });
}
