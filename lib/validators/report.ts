import { z } from "zod";
import { objectIdSchema } from "@/lib/validators/common";

// reporterEmail comes from the JWT, never the body.
export const createReportSchema = z.strictObject({
  campaignId: objectIdSchema,
  reason: z.string().trim().min(10).max(500),
});

export const REPORT_ACTIONS = [
  "resolve",
  "dismiss",
  "suspend_campaign",
  "delete_campaign",
] as const;

export const reportActionSchema = z.strictObject({
  action: z.enum(REPORT_ACTIONS),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportActionInput = z.infer<typeof reportActionSchema>;
