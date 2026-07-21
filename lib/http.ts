import { ApiError } from "@/lib/errors";

// Malformed JSON should be the caller's 400, not an unhandled 500.
export async function readJsonBody(req: Request): Promise<unknown> {
  return req.json().catch(() => {
    throw new ApiError(400, "Invalid JSON body");
  });
}
