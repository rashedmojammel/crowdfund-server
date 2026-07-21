import { requireAdmin, requireSupporter, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { Campaign } from "@/lib/models/Campaign";
import { Report } from "@/lib/models/Report";
import { createReportSchema } from "@/lib/validators/report";

// POST — supporter flags a campaign. reporterEmail comes from the JWT.
export const POST = withAuthErrors(async (req) => {
  const { email } = await requireSupporter(req);
  const { campaignId, reason } = createReportSchema.parse(
    await readJsonBody(req)
  );
  await connectDb();

  const campaignExists = await Campaign.exists({ _id: campaignId });
  if (!campaignExists) throw new ApiError(404, "Campaign not found");

  const report = await Report.create({
    campaignId,
    reporterEmail: email,
    reason,
    status: "open",
  });

  return Response.json({ report }, { status: 201 });
});

// GET — admin: open reports, newest first.
export const GET = withAuthErrors(async (req) => {
  await requireAdmin(req);
  await connectDb();

  const reports = await Report.find({ status: "open" })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({ reports });
});
