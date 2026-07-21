import { requireCreator, verifyRequest, withAuthErrors } from "@/lib/auth";
import { refundApprovedContributions } from "@/lib/contributions";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { Campaign } from "@/lib/models/Campaign";
import { createNotification } from "@/lib/notifications";
import { updateCampaignSchema } from "@/lib/validators/campaign";
import { parseObjectId } from "@/lib/validators/common";

type Ctx = { params: Promise<{ id: string }> };

// GET — any authenticated role: campaign detail page.
export const GET = withAuthErrors<Ctx>(async (req, { params }) => {
  await verifyRequest(req);
  const id = parseObjectId((await params).id);
  await connectDb();

  const campaign = await Campaign.findById(id).lean();
  if (!campaign) throw new ApiError(404, "Campaign not found");

  return Response.json({ campaign });
});

// PATCH — creator-only, own campaigns only. updateCampaignSchema is strict
// and partial: title / story / reward are the only accepted fields.
export const PATCH = withAuthErrors<Ctx>(async (req, { params }) => {
  const { email } = await requireCreator(req);
  const id = parseObjectId((await params).id);
  const fields = updateCampaignSchema.parse(await readJsonBody(req));
  await connectDb();

  // Ownership lives in the query filter, so the check and the update are
  // one atomic operation.
  const campaign = await Campaign.findOneAndUpdate(
    { _id: id, creatorEmail: email },
    { $set: fields },
    { new: true }
  ).lean();

  if (!campaign) {
    const exists = await Campaign.exists({ _id: id });
    if (!exists) throw new ApiError(404, "Campaign not found");
    throw new ApiError(403, "You can only update your own campaigns");
  }

  return Response.json({ campaign });
});

// DELETE — the campaign's creator or an admin. Refunds, audit-trail status
// updates, the delete itself, and all notifications commit or roll back as
// one transaction.
export const DELETE = withAuthErrors<Ctx>(async (req, { params }) => {
  const user = await verifyRequest(req);
  if (user.role !== "creator" && user.role !== "admin") {
    throw new ApiError(403, "Forbidden for your role");
  }
  const id = parseObjectId((await params).id);
  await connectDb();

  const campaign = await Campaign.findById(id).lean();
  if (!campaign) throw new ApiError(404, "Campaign not found");
  if (user.role === "creator" && campaign.creatorEmail !== user.email) {
    throw new ApiError(403, "You can only delete your own campaigns");
  }

  const refunds = await runInTransaction(async (session) => {
    const result = await refundApprovedContributions(
      id,
      campaign.title,
      session
    );
    await Campaign.deleteOne({ _id: id }, { session });

    // An admin deleting someone else's campaign is a state change affecting
    // the creator — notify them, inside the same transaction.
    if (user.role === "admin" && campaign.creatorEmail !== user.email) {
      await createNotification({
        toEmail: campaign.creatorEmail,
        message: `Your campaign "${campaign.title}" was removed by an admin.`,
        actionRoute: "/dashboard/my-campaigns",
        session,
      });
    }
    return result;
  });

  return Response.json({ deleted: true, ...refunds });
});
