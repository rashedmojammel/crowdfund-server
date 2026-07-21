import { z } from "zod";
import { objectIdSchema } from "@/lib/validators/common";

// PATCH body: the IDs to mark read. Ownership (toEmail === JWT email) is
// enforced by the route's query filter, not by this schema.
export const markNotificationsReadSchema = z.strictObject({
  ids: z.array(objectIdSchema).min(1),
});

export type MarkNotificationsReadInput = z.infer<
  typeof markNotificationsReadSchema
>;
