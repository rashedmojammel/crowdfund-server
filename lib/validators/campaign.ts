import { z } from "zod";
import { paginationSchema } from "@/lib/validators/common";
import { CAMPAIGN_CATEGORIES } from "@/types";

export { CAMPAIGN_CATEGORIES };

// creator, status, and amount_raised are never accepted from the body:
// creator comes from the verified JWT, the rest is server-managed state.
export const createCampaignSchema = z.strictObject({
  title: z.string().trim().min(5).max(120),
  story: z.string().trim().min(50).max(10000),
  category: z.enum(CAMPAIGN_CATEGORIES),
  coverImage: z.url(),
  fundingGoal: z.number().int().positive(),
  minimumContribution: z.number().int().min(1).default(1),
  deadline: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now(), "Deadline must be in the future"),
  reward: z.string().trim().min(5).max(500),
});

export const updateCampaignSchema = z
  .strictObject({
    title: z.string().trim().min(5).max(120),
    story: z.string().trim().min(50).max(10000),
    reward: z.string().trim().min(5).max(500),
  })
  .partial()
  .refine(
    (fields) => Object.keys(fields).length > 0,
    "At least one field is required"
  );

// Query-param filters for the public list, on top of shared pagination.
export const listCampaignsQuerySchema = paginationSchema.extend({
  category: z.enum(CAMPAIGN_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
