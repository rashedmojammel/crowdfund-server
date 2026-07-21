# FundSpark — Full Folder Architecture

Two repositories. Client is a full Next.js 15 app (BetterAuth + Gravity UI + Framer Motion). Server is an API-only Next.js on a separate port/deployment.

Legend: `✅` = already scaffolded, `🔨` = you'll build this.

---

## 📦 Client Repo — `crowdfund-client`

```
crowdfund-client/
│
├── ✅ .env.example                        # MongoDB, BetterAuth secret, Google OAuth,
│                                          # Stripe pk/sk, ImgBB key, NEXT_PUBLIC_API_URL
├── ✅ .gitignore
├── ✅ README.md                           # Rubric: name + admin creds + live URL + 10+ features
├── ✅ next.config.ts                      # transpilePackages for Gravity UI, image domains
├── ✅ package.json
├── ✅ tsconfig.json
│
├── app/                                   # Next.js App Router — every folder is a route
│   │
│   ├── ✅ layout.tsx                      # Root layout: Gravity UI styles + <Providers>
│   ├── ✅ providers.tsx                   # ThemeProvider + Toaster + QueryClientProvider
│   ├── ✅ globals.css                     # Reset + .container helper
│   ├── ✅ page.tsx                        # HOME — hero / top-funded / testimonials / 3 extras
│   ├── 🔨 loading.tsx                     # Root loading UI (Gravity UI skeleton)
│   ├── 🔨 error.tsx                       # Root error boundary
│   ├── 🔨 not-found.tsx                   # 404 page
│   │
│   ├── ✅ login/
│   │   └── page.tsx                       # Email/password form + Google Sign-In button
│   │
│   ├── ✅ register/
│   │   └── page.tsx                       # Form + ImgBB upload + role dropdown
│   │
│   ├── ✅ explore/
│   │   └── page.tsx                       # Public campaign grid + filters
│   │
│   ├── 🔨 campaigns/
│   │   └── [id]/
│   │       └── page.tsx                   # Campaign details + <ContributeForm>
│   │                                      # (accessible from both /explore and dashboard)
│   │
│   ├── dashboard/                         # 🔒 Protected route tree — auth guard in layout
│   │   ├── ✅ layout.tsx                  # AUTH GUARD + <DashboardSidebar> + <DashboardTopBar>
│   │   ├── ✅ page.tsx                    # Role-aware home dispatcher
│   │   │
│   │   ├── 🔨 explore-campaigns/          # (Supporter) same grid as /explore, in dashboard shell
│   │   │   └── page.tsx
│   │   │
│   │   ├── 🔨 my-contributions/           # (Supporter) paginated table
│   │   │   └── page.tsx
│   │   │
│   │   ├── 🔨 purchase-credit/            # (Supporter) 4 credit packages
│   │   │   ├── page.tsx                   # Grid of <CreditPackageCard>
│   │   │   ├── success/page.tsx           # Stripe redirect target
│   │   │   └── cancel/page.tsx
│   │   │
│   │   ├── 🔨 payment-history/            # (Supporter + Creator)
│   │   │   └── page.tsx
│   │   │
│   │   ├── 🔨 add-campaign/               # (Creator)
│   │   │   └── page.tsx                   # Form with ImgBB uploader
│   │   │
│   │   ├── 🔨 my-campaigns/               # (Creator)
│   │   │   ├── page.tsx                   # Table sorted by deadline desc
│   │   │   └── [id]/
│   │   │       └── edit/page.tsx          # Update title / story / reward only
│   │   │
│   │   ├── 🔨 withdrawals/                # (Creator)
│   │   │   └── page.tsx                   # Earnings summary + withdrawal form
│   │   │
│   │   ├── 🔨 manage-users/               # (Admin) role dropdown + delete
│   │   │   └── page.tsx
│   │   │
│   │   ├── 🔨 manage-campaigns/           # (Admin) delete any campaign
│   │   │   └── page.tsx
│   │   │
│   │   ├── 🔨 withdrawal-requests/        # (Admin) mark paid
│   │   │   └── page.tsx
│   │   │
│   │   ├── 🔨 reports/                    # (Admin) resolve / dismiss / suspend
│   │   │   └── page.tsx
│   │   │
│   │   └── 🔨 notifications/              # (All roles) full list view
│   │       └── page.tsx
│   │
│   └── api/
│       └── auth/
│           └── [...all]/
│               └── ✅ route.ts            # BetterAuth catch-all handler
│
├── components/
│   │
│   ├── layout/
│   │   ├── ✅ Navbar.tsx                  # Role-aware, shows credits, "Join as Developer"
│   │   ├── ✅ Footer.tsx                  # Social links
│   │   ├── 🔨 DashboardSidebar.tsx        # Role-based nav (Supporter / Creator / Admin)
│   │   ├── 🔨 DashboardTopBar.tsx         # Available credits + user avatar + notification bell
│   │   ├── 🔨 NotificationBell.tsx        # Floating popup, closes on outside click
│   │   ├── 🔨 UserMenu.tsx                # Avatar dropdown + logout
│   │   └── 🔨 MobileNav.tsx               # Hamburger drawer for mobile
│   │
│   ├── home/                              # Homepage sections (all animated with motion)
│   │   ├── 🔨 HeroSlider.tsx              # Swiper, 3 slides, different heading/subtitle each
│   │   ├── 🔨 TopFundedCampaigns.tsx      # Fetches /campaigns/top-funded (6 cards)
│   │   ├── 🔨 HowItWorks.tsx              # Extra section 1 — 3-step visual
│   │   ├── 🔨 ExploreByCategory.tsx       # Extra section 2 — category tiles
│   │   ├── 🔨 PlatformImpact.tsx          # Extra section 3 — animated counters
│   │   └── 🔨 Testimonials.tsx            # Swiper carousel, static data
│   │
│   ├── campaigns/
│   │   ├── 🔨 CampaignCard.tsx            # Cover + title + creator + progress + View Details
│   │   ├── 🔨 CampaignGrid.tsx            # Responsive grid wrapper
│   │   ├── 🔨 CampaignFilters.tsx         # Category / deadline / goal filter UI
│   │   ├── 🔨 ProgressBar.tsx             # amount_raised / funding_goal visual
│   │   ├── 🔨 ContributeForm.tsx          # Amount input + submit → POST /contributions
│   │   ├── 🔨 ReportCampaignButton.tsx    # Modal → POST /reports
│   │   └── 🔨 CampaignStatusBadge.tsx     # pending / approved / rejected / suspended
│   │
│   ├── dashboard/                         # Shared dashboard building blocks
│   │   ├── 🔨 StatsCard.tsx               # Big-number card (used on all role-home pages)
│   │   ├── 🔨 StatsGrid.tsx               # Responsive grid of stats cards
│   │   ├── 🔨 DataTable.tsx               # Reusable table (sort + optional paginate)
│   │   ├── 🔨 Pagination.tsx              # Used on my-contributions
│   │   ├── 🔨 EmptyState.tsx              # "No campaigns yet" etc.
│   │   └── 🔨 RoleBadge.tsx               # Colored badge for user role
│   │
│   ├── dashboard/supporter/
│   │   ├── 🔨 SupporterHome.tsx           # Stats + <ApprovedContributionsTable>
│   │   ├── 🔨 ApprovedContributionsTable.tsx
│   │   ├── 🔨 MyContributionsTable.tsx    # Paginated version with status highlighting
│   │   ├── 🔨 CreditPackageCard.tsx       # One of the 4 packages
│   │   └── 🔨 PaymentHistoryTable.tsx
│   │
│   ├── dashboard/creator/
│   │   ├── 🔨 CreatorHome.tsx             # Stats + <ContributionsToReviewTable>
│   │   ├── 🔨 ContributionsToReviewTable.tsx  # With Approve / Reject / View buttons
│   │   ├── 🔨 ViewContributionModal.tsx   # Detail modal opened from table row
│   │   ├── 🔨 AddCampaignForm.tsx         # Full campaign form + ImgBB
│   │   ├── 🔨 MyCampaignsTable.tsx        # With Update / Delete buttons
│   │   ├── 🔨 UpdateCampaignForm.tsx      # Title / story / reward only
│   │   ├── 🔨 WithdrawalForm.tsx          # Credits input auto-calculates USD
│   │   └── 🔨 WithdrawalHistoryTable.tsx
│   │
│   ├── dashboard/admin/
│   │   ├── 🔨 AdminHome.tsx               # 4 stats: supporters, creators, credits, payments
│   │   ├── 🔨 CampaignApprovalsTable.tsx  # Approve / Reject buttons
│   │   ├── 🔨 WithdrawalRequestsTable.tsx # Payment Success button
│   │   ├── 🔨 ManageUsersTable.tsx        # With <RoleDropdown> per row
│   │   ├── 🔨 RoleDropdown.tsx            # PATCH /users/:id/role on change
│   │   ├── 🔨 ManageCampaignsTable.tsx    # Delete any campaign
│   │   └── 🔨 ReportsTable.tsx            # Suspend / delete reported campaign
│   │
│   ├── forms/                             # Reusable form building blocks
│   │   ├── 🔨 LoginForm.tsx               # RHF + Zod
│   │   ├── 🔨 RegisterForm.tsx            # RHF + Zod + ImgBB
│   │   ├── 🔨 GoogleSignInButton.tsx      # authClient.signIn.social({ provider: "google" })
│   │   ├── 🔨 ImageUploader.tsx           # ImgBB upload + preview
│   │   └── 🔨 FormField.tsx               # Gravity UI TextInput wrapper w/ error state
│   │
│   ├── ui/                                # Small primitive wrappers
│   │   ├── 🔨 Skeleton.tsx                # Loading skeletons for cards/tables
│   │   └── 🔨 ConfirmDialog.tsx           # For deletes
│   │
│   └── animations/                        # Framer Motion primitives
│       ├── 🔨 FadeIn.tsx
│       ├── 🔨 StaggerChildren.tsx
│       └── 🔨 CountUp.tsx                 # For PlatformImpact numbers
│
├── hooks/
│   ├── 🔨 useCurrentUser.ts               # Fetches server /users/me with credits (TanStack Query)
│   ├── 🔨 useNotifications.ts             # List + mark-read + unread count
│   ├── 🔨 useCampaigns.ts                 # list / top-funded / mine / by-id
│   ├── 🔨 useContributions.ts             # create / mine / forCreator / approve / reject
│   ├── 🔨 useWithdrawals.ts               # create / mine / admin-list / approve
│   ├── 🔨 usePayments.ts                  # Stripe checkout redirect + history
│   ├── 🔨 useUsers.ts                     # Admin: list / update-role / delete
│   ├── 🔨 useReports.ts                   # create / admin-list / resolve
│   ├── 🔨 useDebounce.ts                  # For filter inputs
│   └── 🔨 useMediaQuery.ts                # Responsive helpers
│
├── lib/
│   ├── ✅ auth.ts                         # BetterAuth server config (Mongo adapter + Google + JWT plugin)
│   ├── ✅ auth-client.ts                  # BetterAuth React client
│   ├── ✅ api-client.ts                   # apiFetch() — attaches Bearer JWT
│   ├── ✅ utils.ts                        # Credit math constants + CREDIT_PACKAGES + cn()
│   ├── 🔨 imgbb.ts                        # uploadToImgBB(file): Promise<url>
│   ├── 🔨 stripe-client.ts                # loadStripe() singleton
│   ├── 🔨 constants.ts                    # Categories, payment systems, role labels
│   ├── 🔨 validators.ts                   # Zod schemas: loginSchema, registerSchema,
│   │                                      # campaignSchema, contributionSchema, withdrawalSchema
│   └── 🔨 format.ts                       # formatCurrency, formatDate, formatCredits
│
├── types/
│   └── ✅ index.ts                        # UserRole, Campaign, Contribution, Withdrawal,
│                                          # AppNotification, CampaignStatus, etc.
│
└── public/
    ├── 🔨 logo.svg
    ├── 🔨 favicon.ico
    └── 🔨 images/
        ├── hero-1.jpg
        ├── hero-2.jpg
        └── hero-3.jpg
```

---

## 📦 Server Repo — `crowdfund-server`

Runs on port **4000**. API-only — no pages, no UI.

```
crowdfund-server/
│
├── ✅ .env.example                        # MongoDB (same as client), BETTER_AUTH_SECRET (same),
│                                          # Stripe secret + webhook secret, ALLOWED_ORIGINS
├── ✅ .gitignore
├── ✅ README.md                           # Rubric-compliant
├── ✅ middleware.ts                       # Global CORS + preflight for /api/*
├── ✅ next.config.ts
├── ✅ package.json                        # next, mongoose, jose, stripe, zod
├── ✅ tsconfig.json
│
├── app/
│   └── api/
│       │
│       ├── ✅ health/
│       │   └── route.ts                   # GET  — { ok: true, db: "connected" }
│       │
│       ├── 🔨 auth/
│       │   └── grant-signup-bonus/
│       │       └── route.ts               # POST — called ONCE by client after registration
│       │                                  # Sets credits (50 supporter / 20 creator) if
│       │                                  # signupBonusGranted flag is false. Idempotent.
│       │
│       ├── users/
│       │   ├── ✅ route.ts                # GET   — admin: list all users
│       │   ├── 🔨 me/route.ts             # GET   — any role: return own profile + credits
│       │   └── 🔨 [id]/
│       │       ├── route.ts               # DELETE — admin removes user
│       │       └── role/route.ts          # PATCH  — admin updates role via dropdown
│       │
│       ├── campaigns/
│       │   ├── ✅ route.ts                # GET   — public list (approved + in-deadline)
│       │   │                              # POST  — creator: submit new (status pending)
│       │   ├── 🔨 top-funded/route.ts     # GET   — top 6 by amount_raised (home page)
│       │   ├── 🔨 mine/route.ts           # GET   — creator's own, sorted by deadline desc
│       │   └── 🔨 [id]/
│       │       ├── route.ts               # GET one, PATCH update (title/story/reward),
│       │       │                          # DELETE (refunds all approved contributors — TXN)
│       │       ├── approve/route.ts       # PATCH — admin
│       │       ├── reject/route.ts        # PATCH — admin + notify creator
│       │       └── suspend/route.ts       # PATCH — admin (from reports queue)
│       │
│       ├── contributions/
│       │   ├── ✅ route.ts                # POST  — supporter contributes (TXN: deduct + notify)
│       │   │                              # GET   — ?mine=true or ?forCreator=true
│       │   └── 🔨 [id]/
│       │       ├── approve/route.ts       # PATCH — creator: add to amount_raised + notify
│       │       └── reject/route.ts        # PATCH — creator: refund credits (TXN) + notify
│       │
│       ├── withdrawals/
│       │   ├── ✅ route.ts                # POST  — creator requests (min 200 credits)
│       │   │                              # GET   — ?mine=true or admin pending list
│       │   └── 🔨 [id]/
│       │       └── approve/route.ts       # PATCH — admin marks paid, decreases raised credits
│       │
│       ├── payments/
│       │   ├── ✅ route.ts                # POST  — creates Stripe Checkout Session
│       │   │                              # GET   — supporter's payment history
│       │   └── 🔨 webhook/route.ts        # POST  — Stripe webhook: verify signature,
│       │                                  # credit wallet (idempotent via session_id)
│       │
│       ├── notifications/
│       │   ├── ✅ route.ts                # GET   — user's notifications (latest 50)
│       │   │                              # PATCH — mark as read
│       │   └── 🔨 unread-count/route.ts   # GET   — for the notification bell badge
│       │
│       ├── reports/
│       │   ├── ✅ route.ts                # POST  — supporter flags a campaign
│       │   │                              # GET   — admin: open reports
│       │   └── 🔨 [id]/
│       │       └── route.ts               # PATCH — resolve / dismiss
│       │
│       └── 🔨 stats/                      # Dashboard homepage aggregations
│           ├── platform/route.ts          # GET   — admin: totals across the platform
│           ├── creator/route.ts           # GET   — creator: total/active campaigns, raised
│           └── supporter/route.ts         # GET   — supporter: total/pending/approved amounts
│
├── lib/
│   ├── ✅ db.ts                           # Mongoose connection singleton
│   ├── ✅ auth.ts                         # verifyRequest + requireSupporter/Creator/Admin
│   ├── ✅ stripe.ts                       # Stripe SDK singleton
│   ├── 🔨 notifications.ts                # createNotification({ toEmail, message, actionRoute })
│   │                                      # Called from every state change (approve/reject/etc.)
│   ├── 🔨 credits.ts                      # Business logic helpers:
│   │                                      # - deductCredits(email, amount, session)
│   │                                      # - refundCredits(email, amount, session)
│   │                                      # - grantSignupBonus(email, role)
│   │
│   ├── 🔨 validators/                     # Zod schemas — one per resource
│   │   ├── campaign.ts
│   │   ├── contribution.ts
│   │   ├── withdrawal.ts
│   │   └── user.ts
│   │
│   └── models/                            # Mongoose schemas
│       ├── ✅ User.ts                     # Collection: "user" (shared w/ BetterAuth)
│       ├── ✅ Campaign.ts
│       ├── ✅ Contribution.ts
│       ├── ✅ Withdrawal.ts
│       ├── ✅ Payment.ts
│       ├── ✅ Notification.ts
│       └── ✅ Report.ts
│
└── types/
    └── ✅ index.ts                        # UserRole + all status enums
```

---

## 🔑 Key architectural decisions to remember

**Shared state between the two repos:**

| What | Where | Why |
|---|---|---|
| MongoDB URI | Same in both `.env.local` | BetterAuth writes users on client; server reads them |
| `BETTER_AUTH_SECRET` | Same in both `.env.local` | Client signs JWTs with it, server verifies with it |
| User's `role` field | Written by client at registration | Read by server from JWT payload for role gates |
| User's `credits` field | Modified only by the server | Client never writes credits directly |

**Auth flow, end to end:**

```
Register (client)                      → POST /api/auth/sign-up (BetterAuth)
                                       → BetterAuth writes user with role
                                       → Client calls server POST /api/auth/grant-signup-bonus
                                       → Server credits 50 or 20, sets signupBonusGranted=true

Login (client)                         → POST /api/auth/sign-in (BetterAuth)
                                       → Session cookie set on client domain

Any API call from client to server     → GET /api/auth/token (BetterAuth JWT plugin)
                                       → Sends "Authorization: Bearer <jwt>" to server
                                       → Server verifies with jose + shared secret
                                       → Extracts { id, email, role } from payload
                                       → Role guard passes or rejects
```

**Transactions** — Contribution create/approve/reject and campaign delete MUST use Mongoose sessions. Otherwise a network hiccup mid-operation leaves credits inconsistent. Pattern already shown in `crowdfund-server/app/api/contributions/route.ts`.

**The "don't redirect on reload" rule** — In `app/dashboard/layout.tsx`, only redirect after `isPending` is `false`. If you redirect while pending, reload sends the user back to /login every time. This is a common assessment fail.

**Notifications** — every write endpoint that changes another user's world (contribution status, campaign status, withdrawal payout) should call `createNotification()` with the affected user's `toEmail`. The notification bell polls `GET /notifications` and `GET /notifications/unread-count` on an interval.

---

## 🧭 Build order (matches natural commit groupings)

1. Push both scaffolds — first commits on both repos.
2. Auth flow end to end: register → signup bonus → login → dashboard-home dispatcher.
3. Client home page (hero, top-funded, testimonials, 3 extras) with Framer Motion.
4. Creator flow: add campaign → my-campaigns → contributions-to-review → approve/reject.
5. Supporter flow: explore → campaign details → contribute → my-contributions (paginated).
6. Admin flow: campaign approvals → manage users → manage campaigns.
7. Payments: Stripe checkout for credit purchase + webhook + payment history.
8. Withdrawals: creator request → admin payout.
9. Notifications system (floating popup + bell).
10. Reports system.
11. Polish: mobile responsiveness pass, empty states, loading skeletons, deploy.

Following this order gives you the required 20+ / 12+ commits without padding — each step is a natural commit or two.