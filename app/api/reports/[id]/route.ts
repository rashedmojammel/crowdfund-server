import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { readJsonBody } from "@/lib/http";
import { handleReportAction } from "@/lib/reports";
import { parseObjectId } from "@/lib/validators/common";
import { reportActionSchema } from "@/lib/validators/report";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — admin resolves a report. suspend_campaign and delete_campaign
// also act on the reported campaign as part of the same request.
export const PATCH = withAuthErrors<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = parseObjectId((await params).id);
  const { action } = reportActionSchema.parse(await readJsonBody(req));

  const { report, changed } = await handleReportAction(id, action, admin);
  return Response.json({ report, changed });
});
