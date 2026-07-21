import type { AuthUser } from "@/lib/auth";
import { deleteCampaignWithRefunds, setCampaignStatus } from "@/lib/campaigns";
import { connectDb } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { Report, type ReportDoc } from "@/lib/models/Report";
import type { ReportActionInput } from "@/lib/validators/report";

export type ReportAction = ReportActionInput["action"];

export interface ReportActionResult {
  report: ReportDoc;
  changed: boolean;
}

const TARGET_STATUS: Record<ReportAction, "resolved" | "dismissed"> = {
  resolve: "resolved",
  dismiss: "dismissed",
  suspend_campaign: "resolved",
  delete_campaign: "resolved",
};

// Resolve / dismiss / suspend_campaign / delete_campaign, admin-only
// (enforced by the route). Idempotent: a report already in the target
// status is a no-op; a report closed with a different outcome is a 409.
// suspend_campaign and delete_campaign each run their own transaction (via
// setCampaignStatus / deleteCampaignWithRefunds); the report's own status
// update is a separate step afterward, matching how the two documents are
// independently owned — a failure between them just leaves the report
// "open" pointing at an already-actioned campaign, safely retryable.
export async function handleReportAction(
  id: string,
  action: ReportAction,
  admin: AuthUser
): Promise<ReportActionResult> {
  await connectDb();
  const targetStatus = TARGET_STATUS[action];

  const report = await Report.findById(id).lean();
  if (!report) throw new ApiError(404, "Report not found");

  if (report.status === targetStatus) {
    return { report, changed: false };
  }
  if (report.status !== "open") {
    throw new ApiError(409, `Report was already ${report.status}`);
  }

  if (action === "suspend_campaign") {
    await setCampaignStatus(
      String(report.campaignId),
      "suspended",
      (title) => `Your campaign "${title}" was suspended after review.`
    );
  } else if (action === "delete_campaign") {
    await deleteCampaignWithRefunds(String(report.campaignId), admin);
  }

  const updated = await Report.findByIdAndUpdate(
    id,
    { $set: { status: targetStatus } },
    { new: true }
  ).lean();

  return { report: updated as ReportDoc, changed: true };
}
