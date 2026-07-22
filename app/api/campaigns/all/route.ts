import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Campaign } from "@/lib/models/Campaign";

// GET — admin-only. Every campaign regardless of status or deadline, for
// the approvals queue (pending) and the manage-campaigns table (any status).
export const GET = withAuthErrors(async (req) => {
  await requireAdmin(req);
  await connectDb();

  const campaigns = await Campaign.find({}).sort({ createdAt: -1 }).lean();

  return Response.json({ campaigns });
});
