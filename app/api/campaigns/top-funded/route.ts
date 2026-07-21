import { withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Campaign } from "@/lib/models/Campaign";

// GET — public, feeds the home page's "top funded" section.
export const GET = withAuthErrors(async () => {
  await connectDb();

  const campaigns = await Campaign.find({ status: "approved" })
    .sort({ amountRaised: -1 })
    .limit(6)
    .lean();

  return Response.json({ campaigns });
});
