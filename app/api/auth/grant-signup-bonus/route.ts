import { verifyRequest, withAuthErrors } from "@/lib/auth";
import { grantSignupBonus } from "@/lib/credits";
import { runInTransaction } from "@/lib/db";

// POST — called once by the client right after registration. Any
// authenticated role; idempotent (a replay returns granted: false).
export const POST = withAuthErrors(async (req) => {
  const { email } = await verifyRequest(req);

  const result = await runInTransaction((session) =>
    grantSignupBonus(email, session)
  );

  return Response.json({ credits: result.credits, granted: result.granted });
});
