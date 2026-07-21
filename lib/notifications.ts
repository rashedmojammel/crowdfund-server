import type { ClientSession } from "mongoose";
import { connectDb } from "@/lib/db";
import { Notification, type NotificationDoc } from "@/lib/models/Notification";

export interface CreateNotificationInput {
  toEmail: string;
  message: string;
  actionRoute: string;
  session?: ClientSession;
}

// Called from every endpoint that changes another user's state
// (contribution approve/reject, campaign approve/reject/suspend,
// withdrawal payout, signup bonus). Pass the transaction session when the
// state change itself runs in one, so the notification commits or rolls
// back together with it.
export async function createNotification({
  toEmail,
  message,
  actionRoute,
  session,
}: CreateNotificationInput): Promise<NotificationDoc> {
  await connectDb();

  const [notification] = await Notification.create(
    [{ toEmail, message, actionRoute }],
    { session }
  );
  return notification;
}
