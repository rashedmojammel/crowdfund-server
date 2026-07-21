import { requireCreator, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Campaign } from "@/lib/models/Campaign";

// GET — creator-only. Scoped to the JWT's email, so a creator can never
// list anyone else's campaigns. All statuses included (it's their own
// dashboard table).
export const GET = withAuthErrors(async (req) => {
  const { email } = await requireCreator(req);
  await connectDb();

  const campaigns = await Campaign.find({ creatorEmail: email })
    .sort({ deadline: -1 })
    .lean();

  return Response.json({ campaigns });
});
