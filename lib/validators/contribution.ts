import { z } from "zod";
import {
  objectIdSchema,
  paginationSchema,
  queryFlagSchema,
} from "@/lib/validators/common";

// The contributing supporter is identified by the verified JWT, never by
// the body. Amount is in credits.
export const createContributionSchema = z.strictObject({
  campaignId: objectIdSchema,
  amount: z.number().int().positive(),
});

// ?mine=true / ?forCreator=true plus pagination for the ?mine branch.
export const listContributionsQuerySchema = paginationSchema.extend({
  mine: queryFlagSchema.optional(),
  forCreator: queryFlagSchema.optional(),
});

export type CreateContributionInput = z.infer<typeof createContributionSchema>;
export type ListContributionsQuery = z.infer<
  typeof listContributionsQuerySchema
>;
