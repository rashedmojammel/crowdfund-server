import { requireSupporter, withAuthErrors } from "@/lib/auth";
import { getContributableCampaign } from "@/lib/campaigns";
import { deductCredits } from "@/lib/credits";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { Contribution } from "@/lib/models/Contribution";
import { User } from "@/lib/models/User";
import { createContributionSchema } from "@/lib/validators/contribution";

// POST — supporter contributes credits to an approved, in-deadline
// campaign. supporterEmail comes from the JWT, supporterName from the DB
// user document — never the body (the strict schema rejects extras anyway).
// Deduction and contribution creation commit or roll back as one
// transaction; status starts "pending" until the creator reviews it.
export const POST = withAuthErrors(async (req) => {
  const { email } = await requireSupporter(req);
  const { campaignId, amount } = createContributionSchema.parse(
    await readJsonBody(req)
  );
  await connectDb();

  const supporter = await User.findOne({ email }).lean();
  if (!supporter) throw new ApiError(404, "User not found");

  const contribution = await runInTransaction(async (session) => {
    await getContributableCampaign(campaignId, amount, session);
    await deductCredits(email, amount, session);

    const [created] = await Contribution.create(
      [
        {
          campaignId,
          amount,
          supporterEmail: email,
          supporterName: supporter.name ?? email,
          status: "pending",
        },
      ],
      { session }
    );
    return created;
  });

  return Response.json({ contribution }, { status: 201 });
});
