import { requireCreator, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { readJsonBody } from "@/lib/http";
import { Campaign, type CampaignDoc } from "@/lib/models/Campaign";
import { paginate } from "@/lib/pagination";
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

  const { items, total } = await paginate<CampaignDoc>(
    Campaign,
    filter,
    { createdAt: -1 },
    page,
    limit
  );

  return Response.json({ campaigns: items, total, page, limit });
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
