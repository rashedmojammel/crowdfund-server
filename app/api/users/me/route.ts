import { verifyRequest, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { User } from "@/lib/models/User";

// GET — any authenticated role. Identity comes from the JWT; there is no
// way to request another user's profile through this route.
export const GET = withAuthErrors(async (req) => {
  const { email } = await verifyRequest(req);
  await connectDb();

  const user = await User.findOne({ email }).lean();
  if (!user) throw new ApiError(404, "User not found");

  return Response.json({
    user: {
      _id: user._id,
      name: user.name ?? null,
      email: user.email,
      role: user.role,
      credits: user.credits,
      photoURL: user.image ?? null,
      createdAt: user.createdAt,
    },
  });
});
