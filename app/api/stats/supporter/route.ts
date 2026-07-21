import { requireSupporter, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Contribution } from "@/lib/models/Contribution";

// GET — supporter-only dashboard-home stats.
export const GET = withAuthErrors(async (req) => {
  const { email } = await requireSupporter(req);
  await connectDb();

  const [totalContributions, pendingContributions, contributedAgg] =
    await Promise.all([
      Contribution.countDocuments({ supporterEmail: email }),
      Contribution.countDocuments({
        supporterEmail: email,
        status: "pending",
      }),
      Contribution.aggregate([
        { $match: { supporterEmail: email, status: "approved" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
        { $limit: 1 },
      ]),
    ]);

  return Response.json({
    stats: {
      totalContributions,
      pendingContributions,
      totalContributed: contributedAgg[0]?.total ?? 0,
    },
  });
});
