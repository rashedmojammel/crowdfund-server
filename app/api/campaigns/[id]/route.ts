import { requireCreator, verifyRequest, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { Campaign } from "@/lib/models/Campaign";
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
