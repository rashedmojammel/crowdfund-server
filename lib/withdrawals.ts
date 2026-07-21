import type { ClientSession } from "mongoose";
import { getCreatorCampaignIds } from "@/lib/campaigns";
import { runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { Contribution } from "@/lib/models/Contribution";
import { Withdrawal, type WithdrawalDoc } from "@/lib/models/Withdrawal";
import { createNotification } from "@/lib/notifications";

// Available = sum of approved contributions to this creator's campaigns
// minus sum of credits already tied up in pending or approved withdrawals.
// Run inside the same transaction as the write that consumes this number,
// so a concurrent request can't double-book the same credits.
export async function getAvailableWithdrawalCredits(
  creatorEmail: string,
  session?: ClientSession
): Promise<number> {
  const campaignIds = await getCreatorCampaignIds(creatorEmail, session);

  const [earnedAgg] = await Contribution.aggregate([
    { $match: { campaignId: { $in: campaignIds }, status: "approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]).session(session ?? null);

  const [withdrawnAgg] = await Withdrawal.aggregate([
    { $match: { creatorEmail, status: { $in: ["pending", "approved"] } } },
    { $group: { _id: null, total: { $sum: "$credits" } } },
  ]).session(session ?? null);

  return (earnedAgg?.total ?? 0) - (withdrawnAgg?.total ?? 0);
}

export interface ApproveWithdrawalResult {
  withdrawal: WithdrawalDoc;
  changed: boolean;
}

// Admin marks a withdrawal as paid out. There is no separate wallet field
// to decrement: the supporter's credits were already deducted when they
// contributed, and "raised" credits are always derived (approved
// contributions minus approved withdrawals via getAvailableWithdrawalCredits)
// — so approving a withdrawal only flips its own status. Idempotent: an
// already-approved withdrawal is a no-op that does not re-notify.
export async function approveWithdrawal(
  id: string
): Promise<ApproveWithdrawalResult> {
  return runInTransaction(async (session) => {
    const withdrawal = await Withdrawal.findById(id).session(session);
    if (!withdrawal) throw new ApiError(404, "Withdrawal not found");

    if (withdrawal.status === "approved") {
      return { withdrawal: withdrawal.toObject(), changed: false };
    }

    withdrawal.status = "approved";
    await withdrawal.save({ session });

    await createNotification({
      toEmail: withdrawal.creatorEmail,
      message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} to your ${withdrawal.paymentSystem} account has been paid.`,
      actionRoute: "/dashboard/withdrawals",
      session,
    });

    return { withdrawal: withdrawal.toObject(), changed: true };
  });
}
