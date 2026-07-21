import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { parseObjectId } from "@/lib/validators/common";
import { approveWithdrawal } from "@/lib/withdrawals";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — admin marks a withdrawal as paid.
export const PATCH = withAuthErrors<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const id = parseObjectId((await params).id);
  const { withdrawal, changed } = await approveWithdrawal(id);
  return Response.json({ withdrawal, changed });
});
