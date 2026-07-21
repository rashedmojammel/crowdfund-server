import { verifyRequest, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { readJsonBody } from "@/lib/http";
import { Notification } from "@/lib/models/Notification";
import { markNotificationsReadSchema } from "@/lib/validators/notification";

// GET — the requesting user's latest 50 notifications, newest first.
export const GET = withAuthErrors(async (req) => {
  const user = await verifyRequest(req);
  await connectDb();

  const notifications = await Notification.find({ toEmail: user.email })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return Response.json({ notifications });
});

// PATCH — marks the given IDs as read. Scoped to toEmail === JWT email, so
// a user can never mark (or even discover, via a 404) another user's
// notification — non-matching IDs are silently excluded from the update.
export const PATCH = withAuthErrors(async (req) => {
  const user = await verifyRequest(req);
  const { ids } = markNotificationsReadSchema.parse(await readJsonBody(req));
  await connectDb();

  const result = await Notification.updateMany(
    { _id: { $in: ids }, toEmail: user.email },
    { $set: { read: true } }
  );

  return Response.json({ updated: result.modifiedCount });
});
