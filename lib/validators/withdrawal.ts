import { z } from "zod";
import { paginationSchema, queryFlagSchema } from "@/lib/validators/common";
import { MIN_WITHDRAWAL_CREDITS, PAYMENT_SYSTEMS } from "@/types";

export { PAYMENT_SYSTEMS };

// creatorEmail comes from the JWT and USD amount is computed server-side
// (credits / 20) — the body only ever carries credits, never a dollar figure.
export const createWithdrawalSchema = z.strictObject({
  credits: z
    .number()
    .int()
    .min(
      MIN_WITHDRAWAL_CREDITS,
      `Minimum withdrawal is ${MIN_WITHDRAWAL_CREDITS} credits`
    ),
  paymentSystem: z.enum(PAYMENT_SYSTEMS),
  accountNumber: z.string().trim().min(4).max(40),
});

// ?mine=true (creator's own history) with pagination. Default (no mine)
// is the admin-only pending list.
export const listWithdrawalsQuerySchema = paginationSchema.extend({
  mine: queryFlagSchema.optional(),
});

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
export type ListWithdrawalsQuery = z.infer<typeof listWithdrawalsQuerySchema>;
