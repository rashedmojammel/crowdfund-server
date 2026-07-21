import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { parseObjectId } from "@/lib/validators/common";
import { updateRoleSchema } from "@/lib/validators/user";
import { updateUserRole } from "@/lib/users";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — admin changes a user's role via the dropdown. An admin can't
// demote their own account (which would lock them out of admin routes).
export const PATCH = withAuthErrors<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = parseObjectId((await params).id);
  const { role } = updateRoleSchema.parse(await readJsonBody(req));

  if (id === admin.id && role !== "admin") {
    throw new ApiError(400, "You cannot change your own role away from admin");
  }

  const user = await updateUserRole(id, role);
  return Response.json({ user });
});
