import type { ClientSession, Types } from "mongoose";
import { refundCredits } from "@/lib/credits";
import { Contribution } from "@/lib/models/Contribution";
import { createNotification } from "@/lib/notifications";

export interface RefundResult {
  refundedContributions: number;
  refundedCredits: number;
}

// Used when a campaign is deleted: every approved contribution is refunded,
// marked rejected (kept as an audit trail, never deleted), and the supporter
// is notified. MUST run inside a transaction — the session is required, not
// optional, so a non-transactional call is a compile error.
export async function refundApprovedContributions(
  campaignId: Types.ObjectId | string,
  campaignTitle: string,
  session: ClientSession
): Promise<RefundResult> {
  const approved = await Contribution.find({
    campaignId,
    status: "approved",
  }).session(session);

  let refundedCredits = 0;
  for (const contribution of approved) {
    await refundCredits(contribution.supporterEmail, contribution.amount, session);
    refundedCredits += contribution.amount;
  }

  await Contribution.updateMany(
    { campaignId, status: "approved" },
    { $set: { status: "rejected" } },
    { session }
  );

  for (const contribution of approved) {
    await createNotification({
      toEmail: contribution.supporterEmail,
      message: `"${campaignTitle}" was deleted — your ${contribution.amount} credits were refunded.`,
      actionRoute: "/dashboard/my-contributions",
      session,
    });
  }

  return { refundedContributions: approved.length, refundedCredits };
}
