import { requireCreator, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { readJsonBody } from "@/lib/http";
import { Campaign } from "@/lib/models/Campaign";
import {
  createCampaignSchema,
  listCampaignsQuerySchema,
} from "@/lib/validators/campaign";

// GET — deliberately public: the explore page works logged-out. Only
// approved campaigns whose deadline has not passed are visible here.
export const GET = withAuthErrors(async (req) => {
  const { category, page, limit } = listCampaignsQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams)
  );
  await connectDb();

  const filter = {
    status: "approved" as const,
    deadline: { $gte: new Date() },
    ...(category && { category }),
  };

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Campaign.countDocuments(filter),
  ]);

  return Response.json({ campaigns, total, page, limit });
});

// POST — creator submits a new campaign. creatorEmail comes from the JWT,
// never the body; status and amountRaised are server-set, and the strict
// schema rejects any attempt to send them.
export const POST = withAuthErrors(async (req) => {
  const { email } = await requireCreator(req);
  const input = createCampaignSchema.parse(await readJsonBody(req));
  await connectDb();

  const campaign = await Campaign.create({
    ...input,
    creatorEmail: email,
    amountRaised: 0,
    status: "pending",
  });

  return Response.json({ campaign }, { status: 201 });
});
