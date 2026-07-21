import { jwtVerify } from "jose";
import { ZodError } from "zod";
import { ApiError } from "@/lib/errors";
import { USER_ROLES, type UserRole } from "@/types";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// Identity comes ONLY from the verified JWT (signed by the client's
// BetterAuth with the shared BETTER_AUTH_SECRET). Emails, ids, and roles in
// request bodies are never trusted.
export async function verifyRequest(req: Request): Promise<AuthUser> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new ApiError(500, "BETTER_AUTH_SECRET is not set");

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing bearer token");
  }

  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(
      header.slice("Bearer ".length),
      new TextEncoder().encode(secret)
    ));
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const { id, email, role } = payload;
  if (
    typeof id !== "string" ||
    typeof email !== "string" ||
    !USER_ROLES.includes(role as UserRole)
  ) {
    throw new ApiError(401, "Token payload is malformed");
  }
  return { id, email, role: role as UserRole };
}

function requireRole(roles: UserRole[]) {
  return async (req: Request): Promise<AuthUser> => {
    const user = await verifyRequest(req);
    if (!roles.includes(user.role)) {
      throw new ApiError(403, "Forbidden for your role");
    }
    return user;
  };
}

export const requireSupporter = requireRole(["supporter"]);
export const requireCreator = requireRole(["creator"]);
export const requireAdmin = requireRole(["admin"]);

type RouteHandler<C> = (req: Request, context: C) => Promise<Response>;

// Wrap every route handler. Maps thrown ApiError to its status with a
// { message } body, ZodError to 400 with { message, issues }, and anything
// else to a logged 500 — so handlers can throw instead of duplicating
// error-response plumbing.
export function withAuthErrors<C = unknown>(
  handler: RouteHandler<C>
): RouteHandler<C> {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      if (err instanceof ApiError) {
        return Response.json({ message: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return Response.json(
          { message: "Validation failed", issues: err.issues },
          { status: 400 }
        );
      }
      console.error("Unhandled route error:", err);
      return Response.json(
        { message: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
