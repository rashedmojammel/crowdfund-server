import { z } from "zod";
import { paginationSchema } from "@/lib/validators/common";
import { CREDIT_PACKAGES } from "@/types";

// Both fields must exactly match one of the four fixed packages — this
// rejects arbitrary amounts even if credits and amountUsd are individually
// plausible numbers (e.g. 300 credits for $10 is not a valid pair).
export const createPaymentSchema = z
  .strictObject({
    credits: z.number().int().positive(),
    amountUsd: z.number().positive(),
  })
  .refine(
    (input) =>
      CREDIT_PACKAGES.some(
        (pkg) => pkg.credits === input.credits && pkg.amountUsd === input.amountUsd
      ),
    { message: "credits and amountUsd must match a valid credit package" }
  );

export const listPaymentsQuerySchema = paginationSchema;

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
