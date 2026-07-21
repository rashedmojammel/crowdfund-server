import { requireSupporter, verifyRequest, withAuthErrors } from "@/lib/auth";
import { getContributableCampaign } from "@/lib/campaigns";
import { deductCredits } from "@/lib/credits";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { Contribution } from "@/lib/models/Contribution";
import { User } from "@/lib/models/User";
import { createNotification } from "@/lib/notifications";
import {
  createContributionSchema,
  listContributionsQuerySchema,
} from "@/lib/validators/contribution";

// GET — ?mine=true: own contributions, paginated. Scoped to the JWT email.
export const GET = withAuthErrors(async (req) => {
  const user = await verifyRequest(req);
  const query = listContributionsQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams)
  );
  await connectDb();

  if (query.mine) {
    const filter = { supporterEmail: user.email };
    const [items, total] = await Promise.all([
      Contribution.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Contribution.countDocuments(filter),
    ]);
    return Response.json({
      items,
      total,
      page: query.page,
      limit: query.limit,
    });
  }

  throw new ApiError(400, "Specify ?mine=true or ?forCreator=true");
});

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
    const campaign = await getContributableCampaign(campaignId, amount, session);
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

    // A new contribution changes the creator's world — notify them in the
    // same transaction as the deduction.
    await createNotification({
      toEmail: campaign.creatorEmail,
      message: `${supporter.name ?? email} contributed ${amount} credits to "${campaign.title}" — review it now.`,
      actionRoute: "/dashboard",
      session,
    });
    return created;
  });

  return Response.json({ contribution }, { status: 201 });
});
