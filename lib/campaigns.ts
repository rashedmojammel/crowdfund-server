import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { Campaign, type CampaignDoc } from "@/lib/models/Campaign";
import { createNotification } from "@/lib/notifications";
import { parseObjectId } from "@/lib/validators/common";
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
  status: AdminCampaignStatus,
  creatorMessage: (title: string) => string
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

    // Only on a real change — an idempotent replay must not re-notify.
    await createNotification({
      toEmail: campaign.creatorEmail,
      message: creatorMessage(campaign.title),
      actionRoute: "/dashboard/my-campaigns",
      session,
    });

    return { campaign: campaign.toObject(), changed: true };
  });
}

// Guards for POST /api/contributions: campaign must exist, be approved,
// be inside its deadline, and the amount must meet its minimum. Returns
// the campaign so the caller doesn't query twice.
export async function getContributableCampaign(
  id: string,
  amount: number,
  session?: import("mongoose").ClientSession
) {
  const campaign = await Campaign.findById(id).session(session ?? null);
  if (!campaign) throw new ApiError(404, "Campaign not found");
  if (campaign.status !== "approved") {
    throw new ApiError(409, "Campaign is not open for contributions");
  }
  if (campaign.deadline.getTime() < Date.now()) {
    throw new ApiError(409, "Campaign deadline has passed");
  }
  if (amount < campaign.minimumContribution) {
    throw new ApiError(
      400,
      `Minimum contribution for this campaign is ${campaign.minimumContribution} credits`
    );
  }
  return campaign;
}

type Ctx = { params: Promise<{ id: string }> };

// The approve / reject / suspend routes differ only in target status and
// notification wording — this factory is their entire handler.
export function makeCampaignStatusRoute(
  status: AdminCampaignStatus,
  creatorMessage: (title: string) => string
) {
  return withAuthErrors<Ctx>(async (req, { params }) => {
    await requireAdmin(req);
    const id = parseObjectId((await params).id);
    const { campaign, changed } = await setCampaignStatus(
      id,
      status,
      creatorMessage
    );
    return Response.json({ campaign, changed });
  });
}
