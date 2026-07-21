import type { ClientSession, Types } from "mongoose";
import { requireCreator, withAuthErrors, type AuthUser } from "@/lib/auth";
import { refundCredits } from "@/lib/credits";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { Campaign } from "@/lib/models/Campaign";
import { Contribution, type ContributionDoc } from "@/lib/models/Contribution";
import { User } from "@/lib/models/User";
import { createNotification } from "@/lib/notifications";
import { parseObjectId } from "@/lib/validators/common";

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

export type ReviewDecision = "approved" | "rejected";

export interface ReviewResult {
  contribution: ContributionDoc;
  changed: boolean;
}

// Creator reviews a pending contribution to their OWN campaign — ownership
// is checked against the campaign's creatorEmail, which can only come from
// the verified JWT. Idempotent: a same-decision replay is a no-op (no
// double $inc, no double refund, no duplicate notification); a different
// terminal status is a 409. Everything runs in one transaction.
export async function reviewContribution(
  contributionId: string,
  reviewer: AuthUser,
  decision: ReviewDecision
): Promise<ReviewResult> {
  await connectDb();
  const reviewerUser = await User.findOne({ email: reviewer.email }).lean();
  const reviewerName = reviewerUser?.name ?? reviewer.email;

  return runInTransaction(async (session) => {
    const contribution = await Contribution.findById(contributionId).session(
      session
    );
    if (!contribution) throw new ApiError(404, "Contribution not found");

    const campaign = await Campaign.findById(contribution.campaignId).session(
      session
    );
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (campaign.creatorEmail !== reviewer.email) {
      throw new ApiError(
        403,
        "You can only review contributions to your own campaigns"
      );
    }

    if (contribution.status === decision) {
      return { contribution: contribution.toObject(), changed: false };
    }
    if (contribution.status !== "pending") {
      throw new ApiError(
        409,
        `Contribution was already ${contribution.status}`
      );
    }

    contribution.status = decision;
    await contribution.save({ session });

    if (decision === "approved") {
      await Campaign.updateOne(
        { _id: campaign._id },
        { $inc: { amountRaised: contribution.amount } },
        { session }
      );
      await createNotification({
        toEmail: contribution.supporterEmail,
        message: `Your contribution of ${contribution.amount} credits to "${campaign.title}" was approved by ${reviewerName}.`,
        actionRoute: "/dashboard/my-contributions",
        session,
      });
    } else {
      await refundCredits(contribution.supporterEmail, contribution.amount, session);
      await createNotification({
        toEmail: contribution.supporterEmail,
        message: `Your contribution of ${contribution.amount} credits to "${campaign.title}" was rejected. Credits refunded.`,
        actionRoute: "/dashboard/my-contributions",
        session,
      });
    }

    return { contribution: contribution.toObject(), changed: true };
  });
}

type Ctx = { params: Promise<{ id: string }> };

// The approve / reject routes differ only in the decision.
export function makeContributionReviewRoute(decision: ReviewDecision) {
  return withAuthErrors<Ctx>(async (req, { params }) => {
    const user = await requireCreator(req);
    const id = parseObjectId((await params).id);
    const { contribution, changed } = await reviewContribution(
      id,
      user,
      decision
    );
    return Response.json({ contribution, changed });
  });
}
