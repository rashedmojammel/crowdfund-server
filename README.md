# FundSpark — Server

API-only Next.js backend for **FundSpark**, a crowdfunding platform. This repo
has no pages or UI — it's a pure REST API on port `4000`. Rendering, auth
sessions, and JWT issuance are handled by the companion client repo
(`../crowdfund-client`), which shares this server's MongoDB database and
`BETTER_AUTH_SECRET`.

See [`Architecture.md`](./Architecture.md) for the full two-repo folder plan
and business-rule rationale.

## Tech stack

- **Next.js 15** (App Router, API routes only)
- **TypeScript**
- **Mongoose** (MongoDB)
- **jose** — verifies client-signed JWTs
- **Zod** — request validation
- **Stripe** — credit purchases

## How auth works

This server never issues sessions or logs anyone in. The client repo signs a
JWT with BetterAuth (shared `BETTER_AUTH_SECRET`) and sends it as
`Authorization: Bearer <jwt>` on every request. This server verifies it with
`jose` and trusts `{ id, email, role }` from the payload — never from a
request body or query param.

## Credit system

- Buying: **10 credits = $1**. Withdrawing: **20 credits = $1**.
- Minimum withdrawal: **200 credits**.
- Signup bonus, granted once (idempotent): **50 credits** for supporters, **20** for creators.
- Purchases are locked to four fixed packages — arbitrary amounts are rejected before Stripe is ever called:

  | Credits | Price |
  |--------:|------:|
  | 100     | $10   |
  | 300     | $25   |
  | 800     | $60   |
  | 1500    | $110  |

- `User.credits` is mutated only by this server, only via `$inc` — never read-modify-write.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:4000
```

### Environment variables

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Same database as the client repo — BetterAuth writes users, this server reads/mutates them. |
| `BETTER_AUTH_SECRET` | Must match the client repo exactly — client signs JWTs, server verifies. |
| `STRIPE_SECRET_KEY` | Stripe secret key. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed by the CORS middleware (also used as the Stripe Checkout redirect base). |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server on port 4000. |
| `npm run build` | Production build. |
| `npm run start` | Start the production server on port 4000. |
| `npm run typecheck` | `tsc --noEmit`. |

## Deploying to Vercel

This is a stock Next.js App Router project — no `vercel.json` or build
overrides needed. Vercel auto-detects the framework, runs `next build`, and
ignores the `-p 4000` in `npm start` (it assigns its own port). The Mongo
connection in `lib/db.ts` caches on `globalThis`, which is the correct
pattern for serverless — safe as-is.

### Env vars to set in the Vercel dashboard

Project → Settings → Environment Variables. Same five as `.env.example`,
with production-specific values:

| Variable | Production value |
|---|---|
| `MONGODB_URI` | Same Atlas (or hosted) cluster the deployed client uses — not your local dev DB. |
| `BETTER_AUTH_SECRET` | Must be byte-for-byte identical to the value set in the client repo's Vercel project. |
| `STRIPE_SECRET_KEY` | Use the **live** key (`sk_live_...`) once you're off test mode — a test key against live Checkout Sessions will fail. |
| `STRIPE_WEBHOOK_SECRET` | The signing secret from the *production* webhook endpoint (see below) — this is different from the one `stripe listen` gives you locally. |
| `ALLOWED_ORIGINS` | The deployed client's real origin, e.g. `https://your-client.vercel.app` (comma-separate if there's more than one, no trailing slash). |

Set them for the **Production** environment at minimum; add a separate set
scoped to **Preview** if preview deployments need to hit a staging DB/client
instead of production ones.

### After deploying: health check

Hit `GET https://<your-deployment>.vercel.app/api/health` first, before
testing anything else. `{ ok: true, db: "connected" }` confirms the deployed
function can actually reach `MONGODB_URI` — if `MONGODB_URI` is wrong or the
Atlas IP allowlist doesn't include `0.0.0.0/0` (required for Vercel's
serverless IPs), this is where it'll surface, as `{ ok: false, db:
"disconnected" }` / 503, not as a confusing failure somewhere in the UI.

### Manual API smoke test

`scripts/smoke-test.sh` exercises the auth matrix, validation, response
shapes, a full credit round-trip, and idempotency against a running local
server. Requires `curl` and `jq`, and three JWTs (one per role):

```bash
SUPPORTER=<jwt> CREATOR=<jwt> ADMIN=<jwt> bash scripts/smoke-test.sh
```

## API overview

All error responses are `{ message: string }`. Paginated lists return
`{ items, total, page, limit }` (the public campaign list uses `campaigns`
instead of `items`).

### Auth / bootstrap
| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/grant-signup-bonus` | any authenticated role (idempotent) |

### Campaigns
| Method | Route | Access |
|---|---|---|
| GET | `/api/campaigns` | public — approved, in-deadline campaigns |
| POST | `/api/campaigns` | creator |
| GET | `/api/campaigns/mine` | creator — own campaigns, all statuses |
| GET | `/api/campaigns/all` | admin — every campaign, any status, unpaginated |
| GET | `/api/campaigns/top-funded` | public — top 6 by amount raised |
| GET | `/api/campaigns/[id]` | authenticated — 404 if not approved and not yours/admin |
| PATCH | `/api/campaigns/[id]` | creator, own campaign only |
| DELETE | `/api/campaigns/[id]` | creator (own) or admin — refunds contributions |
| PATCH | `/api/campaigns/[id]/approve` | admin |
| PATCH | `/api/campaigns/[id]/reject` | admin |
| PATCH | `/api/campaigns/[id]/suspend` | admin |

### Contributions
| Method | Route | Access |
|---|---|---|
| GET | `/api/contributions?mine=true` | supporter — own contributions, paginated |
| GET | `/api/contributions?forCreator=true` | creator — contributions to own campaigns, paginated |
| POST | `/api/contributions` | supporter |
| PATCH | `/api/contributions/[id]/approve` | creator, own campaign only |
| PATCH | `/api/contributions/[id]/reject` | creator, own campaign only |

### Payments
| Method | Route | Access |
|---|---|---|
| GET | `/api/payments` | authenticated — own payment history, paginated |
| POST | `/api/payments` | supporter — creates a Stripe Checkout Session |

### Withdrawals
| Method | Route | Access |
|---|---|---|
| GET | `/api/withdrawals?mine=true` | creator — own withdrawals, paginated |
| GET | `/api/withdrawals` | admin — pending queue, paginated |
| POST | `/api/withdrawals` | creator |
| PATCH | `/api/withdrawals/[id]/approve` | admin |

### Users
| Method | Route | Access |
|---|---|---|
| GET | `/api/users` | admin — paginated, filter by role/search |
| GET | `/api/users/me` | authenticated — own profile |
| DELETE | `/api/users/[id]` | admin — cascading campaign delete for creators |
| PATCH | `/api/users/[id]/role` | admin |

### Reports
| Method | Route | Access |
|---|---|---|
| POST | `/api/reports` | supporter |
| GET | `/api/reports` | admin — open reports |
| PATCH | `/api/reports/[id]` | admin — resolve / dismiss / suspend_campaign / delete_campaign |

### Notifications
| Method | Route | Access |
|---|---|---|
| GET | `/api/notifications` | authenticated — latest 50 |
| PATCH | `/api/notifications` | authenticated — mark ids read |
| GET | `/api/notifications/unread-count` | authenticated |

### Stats
| Method | Route | Access |
|---|---|---|
| GET | `/api/stats/supporter` | supporter |
| GET | `/api/stats/creator` | creator |
| GET | `/api/stats/platform` | admin |

### Misc
| Method | Route | Access |
|---|---|---|
| GET | `/api/health` | public — DB connectivity check |

## Folder structure & how it's maintained

```
app/api/            Route handlers only — thin: auth check, parse, call lib/, respond
lib/
  auth.ts            JWT verification, role guards (requireSupporter/Creator/Admin), withAuthErrors
  errors.ts          ApiError — the only way a route/lib function reports a failure
  db.ts              Mongoose connection + runInTransaction() helper
  credits.ts         $inc-only credit mutation helpers — the ONLY way User.credits changes
  pagination.ts       Shared paginate() — every list endpoint uses this, same {items,total,page,limit} shape
  http.ts            readJsonBody() — turns bad JSON into a clean 400 instead of a crash
  models/            One Mongoose schema per collection
  validators/        One Zod schema file per resource — the single source of truth for valid shapes
  campaigns.ts, contributions.ts, withdrawals.ts, users.ts,
  reports.ts, notifications.ts, stripe.ts
                     Business logic, one file per resource. Anything that touches the
                     DB more than once, or moves credits, lives here — never inline in a route.
types/               Shared enums/constants (roles, statuses, credit packages) — the
                     definition every model enum and Zod schema pulls from
scripts/             Manual test tooling (smoke-test.sh)
```

**Where a change goes** — this order almost never varies:
1. `types/index.ts` — new enum value or constant, if any.
2. `lib/models/*.ts` — new/changed field on the schema.
3. `lib/validators/*.ts` — the Zod schema is updated *first*, before any route touches the new shape. `z.strictObject` for bodies, `z.coerce.number()` for query params.
4. `lib/<resource>.ts` — the actual logic. Credit-moving operations go inside `runInTransaction()`; credit mutations call the `lib/credits.ts` helpers, never `$inc` inline; state changes that affect another user end with a `createNotification()` call inside the same transaction.
5. `app/api/.../route.ts` — wraps the above in `withAuthErrors(async (req) => { ... })`. If the route body is longer than "auth → parse → call one lib function → respond", the logic almost certainly belongs in step 4 instead.
6. This README's API table, if the endpoint's shape or access rules are new — and `CLAUDE.md` if a new *global* rule was established (not just one endpoint's behavior).

Route handlers deliberately hold no business logic so that `lib/*.ts` functions can be reused across routes (e.g. `deleteCampaignWithRefunds` is called from both `DELETE /api/campaigns/[id]` and the admin report action) without duplicating the transaction.

## Troubleshooting — how errors get diagnosed here

Every error response is `{ message: string }` (validation errors also include `issues`). The status code tells you where to look before you go hunting:

| Status | Means | Where to look |
|---|---|---|
| 401 | Missing/invalid/expired JWT | `lib/auth.ts` `verifyRequest` is the only thing that throws this. Check the `Authorization: Bearer <jwt>` header is present, and that `BETTER_AUTH_SECRET` is identical in both repos' `.env.local`. |
| 403 | Wrong role, or right role but not the owner | A `requireX` role gate, or an explicit ownership check (e.g. `campaign.creatorEmail !== jwt.email`) in the route or `lib/` function. Not a bug by itself — confirm the JWT's role/identity is what you expect. |
| 400 | Zod validation failed | Read the `issues` array in the response body — it names the exact field and rule that failed. The schema is in `lib/validators/<resource>.ts`; fix the request, not the server, unless the schema itself is wrong. |
| 404 | Not found — or deliberately hidden | Real "doesn't exist," **or** a non-approved campaign being hidden from a non-owner/non-admin on purpose (see `CLAUDE.md`: "never leak existence"). If a resource you just created 404s, check its `status` field before assuming a bug. |
| 409 | Business-rule conflict | Intentional `ApiError(409, ...)` — insufficient credits, invalid status transition, a contribution already decided, withdrawal exceeds available balance, etc. The message says exactly which rule fired. |
| 500 | Something actually broke | `withAuthErrors` logs `Unhandled route error: <stack>` to the terminal running `npm run dev` *before* sending the generic body — the client-visible message is intentionally vague, so the real cause is always in that terminal, not the response. |

General workflow when something looks broken:
1. Reproduce it as a single `curl` call (or a line in `scripts/smoke-test.sh`) to isolate client vs. server before touching any code.
2. Check the server terminal for the logged stack trace — most "it just doesn't work" reports are a 500 with the real reason sitting right there.
3. Run `npm run typecheck` — shape mismatches between a route and its caller usually show up here before they'd ever hit runtime.
4. For anything credit-related, inspect the DB directly (`User.credits`, `Contribution.status`, `Campaign.amountRaised`) — since credits only ever move via `$inc` inside a transaction, the DB state tells you precisely which step did or didn't run.
5. Confirm env vars first if the failure is total (nothing works): `MONGODB_URI` unreachable and a mismatched `BETTER_AUTH_SECRET` between the two repos are the two most common "everything is broken" causes.
