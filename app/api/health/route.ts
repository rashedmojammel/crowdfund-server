import { withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";

// GET — deliberately public: deployment / uptime check.
export const GET = withAuthErrors(async () => {
  try {
    await connectDb();
    return Response.json({ ok: true, db: "connected" });
  } catch {
    return Response.json({ ok: false, db: "disconnected" }, { status: 503 });
  }
});
