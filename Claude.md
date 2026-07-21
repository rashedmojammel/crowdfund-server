# Project context

This is the SERVER side of a two-repo crowdfunding platform (FundSpark).
API-only Next.js on port 4000 — no pages, no UI. The client repo lives at
../crowdfund-client and handles all rendering and BetterAuth sessions.
Read Architecture.md for the full folder plan and business rules.

## Non-negotiable rules

- Credit rates: 10 credits = $1 (buy), 20 credits = $1 (withdraw). Minimum withdrawal: 200 credits.
- Signup bonuses (50 supporter, 20 creator) are granted exactly once — enforced here via the `signupBonusGranted` flag; the grant endpoint is idempotent.
- Shared with the client repo: same `MONGODB_URI`, same `BETTER_AUTH_SECRET`. The client signs JWTs; this server verifies them with jose.
- The `credits` field on users is modified ONLY by this server, only via `$inc`.

## Global backend rules

Every route handler must follow these. No exceptions.

### Auth & identity
- Wrap every route handler in `withAuthErrors` from `lib/auth.ts`.
- Identity ALWAYS comes from the verified JWT (`verifyRequest` / `requireSupporter` / `requireCreator` / `requireAdmin`). Never read the acting user's id, email, or role from a request body or query param.
- Role gates are allow-lists: a route without an explicit role guard must still call `verifyRequest` unless it is deliberately public (health, public campaign list).

### Validation
- Every write endpoint parses its body with the matching Zod schema from `lib/validators/` before touching the database. Closed shapes use `z.strictObject`.
- Query params are parsed with `z.coerce.number()` (they arrive as strings).
- ObjectId route params are validated with `objectIdSchema` from `lib/validators/common.ts` before any query.

### Credits & transactions
- Every operation that moves credits runs inside a Mongoose transaction (`session.withTransaction`): contribution create/approve/reject, campaign delete (refunds), withdrawal approval, webhook wallet credit, signup bonus.
- Credit mutations go through `lib/credits.ts` helpers only — `$inc` with guarded filters, never read-modify-write.
- Insufficient balance is a 409. Missing user is a 404.

### Response shapes
- Success responses use named keys, never bare arrays or scalars: `{ campaigns: [...] }`, `{ user: {...} }`, `{ granted: true, credits: 120 }`.
- Error responses are `{ message: string }` with the correct status (400 validation, 401 unauthenticated, 403 wrong role, 404 missing, 409 conflict). `withAuthErrors` produces these from thrown `ApiError` / `ZodError`.
- Paginated lists return `{ items: [...], total, page, limit }` (rename `items` to the resource name).

### Notifications
- Every state change that affects another user calls `createNotification()` from `lib/notifications.ts` — contribution approved/rejected, campaign approved/rejected/suspended, withdrawal paid, bonus granted.
- When the state change runs in a transaction, pass the session so the notification commits or rolls back with it.

### Misc
- Idempotency: Stripe webhook credits are keyed by `session_id`; signup bonus by `signupBonusGranted`. Replays must be no-ops.
- CORS: only origins in `ALLOWED_ORIGINS`. Preflight handled in `middleware.ts`.
- No secrets in responses or logs.

## Tech stack

Next.js 15 (API routes only), TypeScript, Mongoose, jose (JWT verify), Zod, Stripe.

## Commit style

Small, focused commits. Prefix with feat: / fix: / chore: / refactor: / docs:.
