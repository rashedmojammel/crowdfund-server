import { z } from "zod";
import { USER_ROLES } from "@/types";

export const updateRoleSchema = z.strictObject({
  role: z.enum(USER_ROLES),
});

// Parsed from query params, so values arrive as strings — coerce them.
// Not strict: pagination params coexist with other filters in the query.
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
