import { z } from "zod";
import { MIN_WITHDRAWAL_CREDITS, PAYMENT_SYSTEMS } from "@/types";

export { PAYMENT_SYSTEMS };

// The requesting creator comes from the verified JWT. Credits are converted
// at 20 credits = $1 on the server side; the body only carries the amount.
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

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
