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
