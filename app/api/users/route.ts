import { requireAdmin, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { User, type UserDoc } from "@/lib/models/User";
import { paginate } from "@/lib/pagination";
import { listUsersQuerySchema } from "@/lib/validators/user";

// GET — admin-only. Paginated user directory for the admin dashboard, with
// optional role filter and a case-insensitive name/email search. Projection
// is an explicit allow-list so no credential fields ever leave the DB layer.
export const GET = withAuthErrors(async (req) => {
  await requireAdmin(req);
  const { page, limit, role, search } = listUsersQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams)
  );
  await connectDb();

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search) {
    const pattern = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const { items, total } = await paginate<UserDoc>(
    User,
    filter,
    { createdAt: -1 },
    page,
    limit,
    { name: 1, email: 1, role: 1, credits: 1, image: 1, createdAt: 1 }
  );

  return Response.json({ items, total, page, limit });
});
