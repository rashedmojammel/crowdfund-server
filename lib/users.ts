import type { AuthUser } from "@/lib/auth";
import { deleteCampaignWithRefunds, getCreatorCampaignIds } from "@/lib/campaigns";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { User, type UserDoc } from "@/lib/models/User";
import { createNotification } from "@/lib/notifications";
import type { UserRole } from "@/types";

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

// Admin changes a user's role via the dropdown. Self-demotion is blocked at
// the route (an admin can't demote their own account and lock themselves
// out); this helper just does the write and notifies the affected user,
// atomically.
export async function updateUserRole(
  targetId: string,
  role: UserRole
): Promise<UserDoc> {
  await connectDb();

  return runInTransaction(async (session) => {
    const user = await User.findByIdAndUpdate(
      targetId,
      { $set: { role } },
      { new: true, session }
    );
    if (!user) throw new ApiError(404, "User not found");

    await createNotification({
      toEmail: user.email,
      message: `Your role has been updated to ${role} by an administrator.`,
      actionRoute: "/dashboard",
      session,
    });

    return user.toObject();
  });
}
