import { z } from "zod";
import { paginationSchema } from "@/lib/validators/common";
import { USER_ROLES } from "@/types";

export const updateRoleSchema = z.strictObject({
  role: z.enum(USER_ROLES),
});

// Query params, so not strict — pagination fields coexist with the filters.
export const listUsersQuerySchema = paginationSchema.extend({
  role: z.enum(USER_ROLES).optional(),
  search: z.string().trim().min(1).optional(),
});

export { paginationSchema };

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;
