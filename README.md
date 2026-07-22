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

## Project structure

```
app/api/           Route handlers only — no business logic
lib/                Shared logic
  auth.ts           JWT verification, role guards, withAuthErrors
  credits.ts        $inc-only credit mutation helpers
  db.ts             Mongoose connection + transaction helper
  models/           Mongoose schemas
  validators/       Zod schemas per resource
  notifications.ts, campaigns.ts, contributions.ts, withdrawals.ts,
  users.ts, reports.ts, stripe.ts, pagination.ts
types/              Shared enums and constants
scripts/            Manual test tooling
```
