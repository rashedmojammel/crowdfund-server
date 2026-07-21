import { z } from "zod";
import { paginationSchema } from "@/lib/validators/common";
import { USER_ROLES } from "@/types";

export const updateRoleSchema = z.strictObject({
  role: z.enum(USER_ROLES),
});

export { paginationSchema };

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
