import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { setCampaignStatus } from "@/lib/campaigns";
import { parseObjectId } from "@/lib/validators/common";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — admin approves a pending (or reinstates a suspended) campaign.
export const PATCH = withAuthErrors<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const id = parseObjectId((await params).id);

  const { campaign, changed } = await setCampaignStatus(
    id,
    "approved",
    (title) => `Your campaign "${title}" was approved.`
  );

  return Response.json({ campaign, changed });
});
