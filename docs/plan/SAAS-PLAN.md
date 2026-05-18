# SaaS Implementation Plan

## Decisions Summary


| Decision             | Choice                                                    |
| -------------------- | --------------------------------------------------------- |
| Billing model        | Credits per scene                                         |
| Model multipliers    | flux-dev 2×, video 5×                                     |
| Free tier            | Disabled now, activatable via DB flag                     |
| Payment processor    | Stripe                                                    |
| Pack structure       | Preset packs + custom amount                              |
| Auth                 | BetterAuth + Google OAuth                                 |
| Database             | Supabase (Postgres)                                       |
| ORM                  | Drizzle + postgres driver (port 6543 pooler)              |
| Story access         | Always private (no public links)                          |
| Admin identity       | `role` column in DB, embedded in session JWT              |
| Security             | API-layer auth, no RLS (all queries server-side)          |
| Credit deduction     | Per scene as confirmed (Option C), atomic Postgres UPDATE |
| Race condition guard | `UPDATE ... WHERE credits >= ?` returning row count       |
| Story storage        | Unlimited per user                                        |
| Webhook safety       | Idempotent via `stripe_payment_id UNIQUE`                 |
| Cost tracking        | Wrapper around every provider call → `api_cost_logs`      |
| Dashboard            | Admin (profitability) + User (usage/history)              |


---

## Credit Pricing


| Pack    | Credits | Price        | Est. API cost | Margin |
| ------- | ------- | ------------ | ------------- | ------ |
| Starter | 100     | $5           | ~$0.80        | ~84%   |
| Pro     | 500     | $20          | ~$4           | ~80%   |
| Power   | 1500    | $50          | ~$12          | ~76%   |
| Custom  | any     | $0.05/credit | varies        | varies |


### Model multipliers


| Operation            | Credits      |
| -------------------- | ------------ |
| Text (plan)          | 0 (included) |
| Image flux-schnell   | 1×           |
| Image flux-dev       | 2×           |
| Image sdxl-lightning | 1×           |
| Video LTX            | 5×           |
| Video Longcat        | 5×           |
| Video Kling          | 5×           |
| ElevenLabs voiceover | 1×           |
| Thumbnail            | 1×           |


---

## Database Schema

```sql
-- Managed by BetterAuth
users         (id, email, name, image, role, credits, free_credits_activated, created_at, updated_at)
sessions      (BetterAuth managed)
accounts      (BetterAuth managed — Google OAuth)

-- Stories
stories       (id, user_id, title, tagline, protagonist, thumbnail_url, scene_count, created_at, updated_at)
scenes        (id, story_id, order_index, image_url, voiceover_url, video_url,
               sentence, voiceover_text, action, setting, emotion,
               image_model, video_model, credits_charged, cost_usd, created_at)

-- Payments
payments      (id, user_id, stripe_payment_id UNIQUE, credits_purchased,
               amount_usd, pack_type, created_at)

-- Cost tracking
api_cost_logs (id, user_id, story_id, scene_id, provider, model, operation,
               cost_usd, credits_charged, created_at)

-- Config
app_config    (key TEXT PRIMARY KEY, value TEXT)
-- Row: ('free_credits_on_signup', '0')  -- set to '20' to activate
```

---

## Route Protection


| Route                    | Protection                       |
| ------------------------ | -------------------------------- |
| `/`                      | Public                           |
| `/auth/login`            | Public                           |
| `/auth/signup`           | Public                           |
| `/dashboard`             | Auth required                    |
| `/[category]/new`        | Auth required                    |
| `/[category]/story/[id]` | Auth required + owner check      |
| `/settings`              | Auth required                    |
| `/admin/*`               | Auth required + role === 'admin' |
| `/api/*` (all)           | Auth required + credit check     |
| `/api/webhooks/fal/*`    | FAL signature verify only        |
| `/api/webhooks/stripe`   | Stripe signature verify only     |


---

## Phase 1 — Supabase + Drizzle Setup

**Goal:** DB connection working, schema migrated, Drizzle client exported.

**Steps:**

1. Install: `pnpm add drizzle-orm postgres` + `pnpm add -D drizzle-kit`
2. Add env vars: `DATABASE_URL` (port 6543 transaction pooler)
3. Create `lib/db/index.ts` — Drizzle client singleton
4. Create `lib/db/schema.ts` — full schema definitions
5. Create `drizzle.config.ts`
6. Run `pnpm drizzle-kit push` to migrate

**Files to create:**

- `lib/db/index.ts`
- `lib/db/schema.ts`
- `drizzle.config.ts`

---

## Phase 2 — BetterAuth Setup

**Goal:** Auth API route working, Google OAuth configured, role + credits in session JWT.

**Steps:**

1. Install: `pnpm add better-auth`
2. Create `lib/auth.ts` — BetterAuth config with Drizzle adapter, Google provider, additionalFields (role, credits)
3. Create `app/api/auth/[...all]/route.ts`
4. Create `lib/auth-client.ts` — client-side auth helpers
5. Add env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

**Files to create:**

- `lib/auth.ts`
- `lib/auth-client.ts`
- `app/api/auth/[...all]/route.ts`

---

## Phase 3 — Auth Middleware

**Goal:** All protected routes redirect unauthenticated users. Admin routes block non-admins. Webhooks bypass user auth.

**Steps:**

1. Create `middleware.ts` at project root
2. Use BetterAuth `auth.api.getSession()` to validate session from cookie
3. Redirect to `/auth/login` if no session on protected routes
4. Return 403 if `role !== 'admin'` on `/admin/`*
5. Skip auth check for `/api/webhooks/*`

**Files to create:**

- `middleware.ts`

---

## Phase 4 — Auth UI

**Goal:** Login page with Google button. Session-aware nav.

**Steps:**

1. Create `app/auth/login/page.tsx` — Google OAuthtton
2. Create `app/auth/signup/page.tsx` — same, or redirect to login
3. Update `components/layout/TopBar.tsx` — show user avatar + name when signed in
4. Update `components/layout/AvatarMenu.tsx` — add sign out, credit balance
5. Add credit balance display in `components/workspace/status/CreditsPill.tsx`

**Files to create/modify:**

- `app/auth/login/page.tsx`
- `app/auth/signup/page.tsx`
- `components/layout/TopBar.tsx`
- `components/layout/AvatarMenu.tsx`
- `components/workspace/status/CreditsPill.tsx`

---

## Phase 5 — Credit System

**Goal:** Credits deducted atomically per confirmed scene. Generation blocked if insufficient.

**Steps:**

1. Add `deductCredit(userId, amount)` to `lib/db/credits.ts` — atomic UPDATE returning new balance
2. In `app/api/generate/route.ts` — check credit balance before starting, deduct per `scene-image` event confirmed
3. Add `insufficient_credits` SSE event type to `lib/types.ts`
4. Surface error in workspace UI
5. Add `GET /api/credits` route — return current balance

**Files to create/modify:**

- `lib/db/credits.ts`
- `app/api/generate/route.ts`
- `app/api/credits/route.ts`
- `lib/types.ts`

---

## Phase 6 — Story Persistence

**Goal:** Stories + scenes saved to Supabase. Dashboard loads from DB.

**Steps:**

1. Create `lib/db/stories.ts` — CRUD helpers (create, getByUser, getById, delete)
2. On generation complete: save story + all scenes to DB
3. Update `app/dashboard/page.tsx` — load stories from DB not local state
4. Update `app/[category]/story/[id]/page.tsx` — load from DB, verify owner
5. Update delete story flow — cascade delete scenes + Vercel Blob cleanup

**Files to create/modify:**

- `lib/db/stories.ts`
- `app/api/generate/route.ts`
- `app/dashboard/page.tsx`
- `app/[category]/story/[id]/page.tsx`

---

## Phase 7 — Stripe Integration

**Goal:** Users can buy credits. Webhook reliably adds credits with idempotency.

**Steps:**

1. Install: `pnpm add stripe`
2. Create `app/api/stripe/checkout/route.ts` — creates Stripe checkout session (packs + custom)
3. Create `app/api/webhooks/stripe/route.ts` — handles `checkout.session.completed`, idempotent credit add
4. Create `components/billing/CreditPurchaseModal.tsx` — pack selector + custom input + Stripe redirect
5. Add Stripe env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Files to create:**

- `app/api/stripe/checkout/route.ts`
- `app/api/webhooks/stripe/route.ts`
- `components/billing/CreditPurchaseModal.tsx`

---

## Phase 8 — API Cost Logging

**Goal:** Every AI call logged with cost to `api_cost_logs`.

**Cost constants (USD):**


| Provider   | Model/Op         | Cost               |
| ---------- | ---------------- | ------------------ |
| FAL        | flux-schnell     | $0.003/image       |
| FAL        | flux-dev         | $0.025/image       |
| FAL        | sdxl-lightning   | $0.004/image       |
| FAL        | LTX video        | $0.10/clip         |
| FAL        | Longcat video    | $0.15/clip         |
| FAL        | Kling video      | $0.20/clip         |
| Gemini     | 2.5-flash input  | $0.00015/1k tokens |
| Gemini     | 2.5-flash output | $0.0006/1k tokens  |
| Groq       | llama-3.3-70b    | $0.00059/1k tokens |
| NVIDIA     | nemotron-ultra   | $0.008/1k tokens   |
| ElevenLabs | TTS              | $0.0003/char       |


**Steps:**

1. Create `lib/db/cost-logger.ts` — `logApiCost(params)` writes to `api_cost_logs`
2. Wrap `lib/providers/image-fal-*.ts` — log after each image generation
3. Wrap `lib/providers/video-fal-*.ts` — log after each video generation
4. Wrap `lib/providers/text-*.ts` — log with token counts
5. Wrap `lib/externals/elevenlabs.ts` — log with char count

**Files to create/modify:**

- `lib/db/cost-logger.ts`
- All provider files in `lib/providers/`
- `lib/externals/elevenlabs.ts`

---

## Phase 9 — User Dashboard

**Goal:** Users see credit balance, usage per story, purchase history, model breakdown.

**Sections:**

- Credit balance + buy credits button
- Usage history: table of stories with credits spent, date, model combo
- Payment history: date, pack type, credits purchased, amount paid
- Model breakdown: pie/bar chart of credits by model type

**Files to create:**

- `app/usage/page.tsx`
- `components/billing/UsageTable.tsx`
- `components/billing/PaymentHistory.tsx`
- `components/billing/ModelBreakdown.tsx`
- `app/api/user/usage/route.ts`

---

## Phase 10 — Admin Dashboard

**Goal:** Full profitability view for operator.

**Sections:**

- Revenue vs API cost over time (daily/weekly chart)
- Gross margin % by model combo
- Per-user spend table (API cost vs credits purchased)
- Top 10 most expensive users
- Unprofitable users (API cost > credits purchased value)
- Total stats: revenue, costs, margin, active users

**Files to create:**

- `app/admin/page.tsx`
- `app/admin/users/page.tsx`
- `components/admin/CostRevenueChart.tsx`
- `components/admin/MarginByModel.tsx`
- `components/admin/UserSpendTable.tsx`
- `app/api/admin/stats/route.ts`
- `app/api/admin/users/route.ts`

---

## Phase 11 — Settings Page Update

**Goal:** Settings shows profile, credit balance, connected accounts.

**Steps:**

1. Add credit balance section
2. Add connected OAuth accounts list
3. Add "Buy Credits" shortcut button
4. Profile: update name/avatar

**Files to modify:**

- `app/settings/page.tsx`
- `components/settings/SettingsPanel.tsx`

---

## Phase 12 — Free Credits Activation Flag

**Goal:** Admin can activate free credits on signup without code changes.

**Implementation:**

- `app_config` table row: `('free_credits_on_signup', '0')`
- On user signup (BetterAuth `onAfterSignup` hook): read config, if > 0 add credits
- Admin dashboard toggle to update config value

**Files to create/modify:**

- `lib/db/config.ts`
- `lib/auth.ts` (signup hook)
- `app/admin/page.tsx` (toggle UI)

---

## Environment Variables Required

```bash
# Supabase
DATABASE_URL=postgresql://...@aws-0-*.pooler.supabase.com:6543/postgres

# BetterAuth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

