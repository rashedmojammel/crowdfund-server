import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { parseObjectId } from "@/lib/validators/common";
import { deleteUserAccount } from "@/lib/users";

type Ctx = { params: Promise<{ id: string }> };

// DELETE — admin removes a user account. Creators' campaigns are deleted
// with refunds first; supporters' historical records are left intact.
export const DELETE = withAuthErrors<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = parseObjectId((await params).id);

  await deleteUserAccount(id, admin);

  return Response.json({ ok: true });
});
