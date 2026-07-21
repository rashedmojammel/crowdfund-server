import { verifyRequest, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Notification } from "@/lib/models/Notification";

// GET — any authenticated role. Feeds the notification bell's badge.
export const GET = withAuthErrors(async (req) => {
  const user = await verifyRequest(req);
  await connectDb();

  const count = await Notification.countDocuments({
    toEmail: user.email,
    read: false,
  });

  return Response.json({ count });
});
