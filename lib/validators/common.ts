import mongoose from "mongoose";
import { z } from "zod";

export const objectIdSchema = z
  .string()
  .refine((value) => mongoose.isValidObjectId(value), "Invalid ID");

// For [id] route params: validates before any query so a malformed id is a
// 400 from Zod, not a Mongoose CastError 500.
export function parseObjectId(value: string): string {
  return objectIdSchema.parse(value);
}

// Parsed from query params, so values arrive as strings — coerce them.
// Not strict: pagination coexists with other filters in the query string.
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// z.coerce.boolean() would turn "false" into true — parse explicitly.
export const queryFlagSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
