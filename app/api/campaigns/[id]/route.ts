import { verifyRequest, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { Campaign } from "@/lib/models/Campaign";
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
