import type { ClientSession } from "mongoose";
import { connectDb } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { User, type UserDoc } from "@/lib/models/User";
import { createNotification } from "@/lib/notifications";
import { SIGNUP_BONUS, type UserRole } from "@/types";

function assertValidAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, "Credit amount must be a positive integer");
  }
}

// All mutations use $inc with a guarded filter so balances can never go
// negative and there is no read-modify-write race. `email` must always come
// from the verified JWT, never from a request body.

export async function deductCredits(
  email: string,
  amount: number,
  session?: ClientSession
): Promise<UserDoc> {
  assertValidAmount(amount);
  await connectDb();

  const user = await User.findOneAndUpdate(
    { email, credits: { $gte: amount } },
    { $inc: { credits: -amount } },
    { new: true, session }
  );

  if (!user) {
    const exists = await User.exists({ email }).session(session ?? null);
    if (!exists) throw new ApiError(404, "User not found");
    throw new ApiError(409, "Insufficient credits");
  }
  return user;
}

export async function refundCredits(
  email: string,
  amount: number,
  session?: ClientSession
): Promise<UserDoc> {
  assertValidAmount(amount);
  await connectDb();

  const user = await User.findOneAndUpdate(
    { email },
    { $inc: { credits: amount } },
    { new: true, session }
  );

  if (!user) throw new ApiError(404, "User not found");
  return user;
}

export interface SignupBonusResult {
  granted: boolean;
  bonus: number;
  credits: number;
}

// Idempotent: the signupBonusGranted flag lives in the update filter, so a
// second call (double-click, retry, replay) matches no document and grants
// nothing. Safe to call unconditionally after registration.
export async function grantSignupBonus(
  email: string,
  session?: ClientSession
): Promise<SignupBonusResult> {
  await connectDb();

  const existing = await User.findOne({ email }).session(session ?? null);
  if (!existing) throw new ApiError(404, "User not found");

  const bonus = SIGNUP_BONUS[existing.role as UserRole];
  if (!bonus) {
    return { granted: false, bonus: 0, credits: existing.credits };
  }

  const user = await User.findOneAndUpdate(
    { email, signupBonusGranted: { $ne: true } },
    { $inc: { credits: bonus }, $set: { signupBonusGranted: true } },
    { new: true, session }
  );

  if (!user) {
    return { granted: false, bonus: 0, credits: existing.credits };
  }

  await createNotification({
    toEmail: email,
    message: `Welcome! ${bonus} bonus credits were added to your wallet.`,
    actionRoute: "/dashboard",
    session,
  });

  return { granted: true, bonus, credits: user.credits };
}
