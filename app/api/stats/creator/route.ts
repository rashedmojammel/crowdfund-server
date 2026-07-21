import { requireCreator, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Campaign } from "@/lib/models/Campaign";

// GET — creator-only dashboard-home stats.
export const GET = withAuthErrors(async (req) => {
  const { email } = await requireCreator(req);
  await connectDb();

  const [totalCampaigns, activeCampaigns, raisedAgg] = await Promise.all([
    Campaign.countDocuments({ creatorEmail: email }),
    Campaign.countDocuments({
      creatorEmail: email,
      status: "approved",
      deadline: { $gte: new Date() },
    }),
    Campaign.aggregate([
      { $match: { creatorEmail: email } },
      { $group: { _id: null, total: { $sum: "$amountRaised" } } },
      { $limit: 1 },
    ]),
  ]);

  return Response.json({
    stats: {
      totalCampaigns,
      activeCampaigns,
      totalRaised: raisedAgg[0]?.total ?? 0,
    },
  });
});
