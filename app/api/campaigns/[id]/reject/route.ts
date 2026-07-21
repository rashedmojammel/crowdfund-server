import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { setCampaignStatus } from "@/lib/campaigns";
import { parseObjectId } from "@/lib/validators/common";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — admin rejects a pending campaign.
export const PATCH = withAuthErrors<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const id = parseObjectId((await params).id);

  const { campaign, changed } = await setCampaignStatus(
    id,
    "rejected",
    (title) => `Your campaign "${title}" was rejected.`
  );

  return Response.json({ campaign, changed });
});
