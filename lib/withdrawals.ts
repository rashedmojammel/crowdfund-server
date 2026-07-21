import type { ClientSession } from "mongoose";
import { Campaign } from "@/lib/models/Campaign";
import { Contribution } from "@/lib/models/Contribution";
import { Withdrawal } from "@/lib/models/Withdrawal";

export async function getCreatorCampaignIds(
  creatorEmail: string,
  session?: ClientSession
) {
  return Campaign.find({ creatorEmail })
    .session(session ?? null)
    .distinct("_id");
}

// Available = sum of approved contributions to this creator's campaigns
// minus sum of credits already tied up in pending or paid withdrawals.
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
    { $match: { creatorEmail, status: { $in: ["pending", "paid"] } } },
    { $group: { _id: null, total: { $sum: "$credits" } } },
  ]).session(session ?? null);

  return (earnedAgg?.total ?? 0) - (withdrawnAgg?.total ?? 0);
}
