import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Payment } from "@/lib/models/Payment";
import { User } from "@/lib/models/User";

// GET — admin-only platform-wide totals.
export const GET = withAuthErrors(async (req) => {
  await requireAdmin(req);
  await connectDb();

  const [totalSupporters, totalCreators, creditsAgg, totalPayments] =
    await Promise.all([
      User.countDocuments({ role: "supporter" }),
      User.countDocuments({ role: "creator" }),
      User.aggregate([
        { $group: { _id: null, total: { $sum: "$credits" } } },
        { $limit: 1 },
      ]),
      Payment.countDocuments({ status: "succeeded" }),
    ]);

  return Response.json({
    stats: {
      totalSupporters,
      totalCreators,
      totalCredits: creditsAgg[0]?.total ?? 0,
      totalPayments,
    },
  });
});
