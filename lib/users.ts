import type { AuthUser } from "@/lib/auth";
import { deleteCampaignWithRefunds, getCreatorCampaignIds } from "@/lib/campaigns";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { User } from "@/lib/models/User";

// Admin deletes a user account. If the user is a creator, every one of
// their campaigns is deleted with refunds first (same session, no creator
// notification — the account is about to be gone) so contributors aren't
// left funding a campaign whose owner no longer exists. If the user is a
// supporter, their contribution history is left intact untouched — their
// credits simply die with the account rather than being refunded to no one.
// The whole cascade + the user delete is one transaction.
export async function deleteUserAccount(
  targetId: string,
  admin: AuthUser
): Promise<void> {
  await connectDb();

  await runInTransaction(async (session) => {
    const user = await User.findById(targetId).session(session);
    if (!user) throw new ApiError(404, "User not found");

    if (user.role === "creator") {
      const campaignIds = await getCreatorCampaignIds(user.email, session);
      for (const campaignId of campaignIds) {
        await deleteCampaignWithRefunds(String(campaignId), admin, {
          session,
          notifyCreator: false,
        });
      }
    }

    await User.deleteOne({ _id: targetId }, { session });
  });
}
