import { z } from "zod";
import { objectIdSchema } from "@/lib/validators/common";

// The contributing supporter is identified by the verified JWT, never by
// the body. Amount is in credits.
export const createContributionSchema = z.strictObject({
  campaignId: objectIdSchema,
  amount: z.number().int().positive(),
});

export type CreateContributionInput = z.infer<typeof createContributionSchema>;
