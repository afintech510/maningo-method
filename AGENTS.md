# Maningo Method

Online studio booking & membership system for a pilates studio — subscriptions, class credits, gift packs, and referrals.

## What this is

A Next.js 14 (App Router) web app where members book pilates classes and manage memberships. It supports recurring subscriptions, credit/class packs, drop-ins, gift packs (including guest gifting), referral rewards, discount codes/campaigns, and manual (offline) payments. There are member-facing, admin, and superadmin areas, plus transactional email and automated reminder/review flows. Payments run through Stripe; data and auth live in Supabase; email is sent via Resend.

## Stack

- **Framework:** Next.js `14.2.35` (App Router, `output: 'standalone'`), React 18, TypeScript 5
- **Styling:** Tailwind CSS 3
- **Auth + DB:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — Postgres with RLS
- **Payments:** Stripe (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`)
- **Email:** Resend (`resend`) + React Email (`@react-email/components`, `@react-email/render`)
- **Validation:** Zod 4
- **Logging:** Pino
- **Waivers:** SignWell (optional integration; see `src/lib/signwell.ts`)
- **Testing:** Vitest 4 (`tests/`, config in `vitest.config.ts`)
- **Runtime:** Node 20 (alpine) in Docker

## Where it runs

- **Host:** Hetzner VPS `5.161.88.134` (ssh alias `hampton-vps`, user `root`). Cloudflare sits in front.
- **Path on VPS:** `/opt/maningo-method`
- **Container:** `maningo_app` — host port **3003** → container port **3000** (`docker-compose.yml`)
- **Domains:** `https://www.maningomethod.com` (prod) and `https://maningo.hosthampton.com`
- **Reverse proxy:** Shared nginx owned by `host-hampton-ops` at `/opt/hosthampton`. This project attaches to the external Docker network declared in `docker-compose.yml` as `hampton_nginx` (its real Docker name is `hosthampton_hampton_net`), so the proxy can reach the container by name. The nginx server block for this app is in `nginx/maningo.conf` (proxies to `host.docker.internal:3003`).

## Run locally

```bash
# 1. Install deps
npm ci

# 2. Create a local env file from the template and fill it in (see Environment section)
cp .env.example .env

# 3. Start the dev server (http://localhost:3000)
npm run dev
```

Other useful scripts (from `package.json`):

```bash
npm run build      # production build
npm run start      # run the production build
npm run lint       # eslint (next lint)
npm run test       # vitest run (one-shot)
npm run test:watch # vitest watch mode
npm run predeploy  # lint + test + build (run before deploying)
```

## Deploy

There is **no CI/CD** (no GitHub Actions). Deployment is manual on the VPS over SSH. Public-facing `NEXT_PUBLIC_*` values are baked in at build time (passed as Docker build args from the env in `docker-compose.yml`), so a code or public-env change requires a rebuild, not just a restart.

```bash
# On the VPS (ssh hampton-vps), from the project directory
cd /opt/maningo-method

# Pull latest, then rebuild + recreate the container
git pull
docker compose -f /opt/maningo-method/docker-compose.yml up -d --build

# Restart without rebuilding (env_file change only, no new image needed)
docker compose -f /opt/maningo-method/docker-compose.yml restart

# Stop
docker compose -f /opt/maningo-method/docker-compose.yml down

# Verify
curl http://localhost:3003/api/health
curl https://maningo.hosthampton.com/api/health
```

The container has a 512M memory limit and `restart: unless-stopped`.

## Database

- **Supabase project ref:** `nyznqcnpykmtqvhgbsao` (URL `https://nyznqcnpykmtqvhgbsao.supabase.co`)
- **Local Supabase config:** `supabase/config.toml` (api port `54321`, db port `54322`, auth `site_url = https://maningo.hosthampton.com`)
- **Migrations:** 34 sequential SQL files in `supabase/migrations/` (`001_create_profiles.sql` … `034_discount_once_per_member.sql`). They are also concatenated into `supabase/all_migrations.sql` for convenient one-shot application.

### Applying migrations

These are plain SQL. Apply them in numeric order via the Supabase SQL editor / dashboard, or paste `supabase/all_migrations.sql` to run them all at once. `scripts/run-migrations.mjs` exists as a helper but only lists migrations `001`–`006` and posts to a pg-meta endpoint — treat it as a reference, not the source of truth; verify which migrations are already applied before running anything.

### Key tables (from migrations)

- `profiles` — members (incl. roles: admin / superadmin; consent & waiver columns; phone)
- `classes` / `class_series` — scheduled classes and recurring series
- `bookings` — reservations (status, `reminder_sent_at`, payment type: pack/credit/comp, added-by-admin)
- `subscriptions` — Stripe-backed recurring memberships
- `processed_events` — Stripe webhook idempotency ledger
- `credits` / `credit_adjustments` — class-credit balances and manual adjustments
- `referrals` — referral tracking (one-per-friend constraint)
- `gift_packs` — gift purchases incl. guest gifting and gift balance
- `manual_payments` — offline/provisional payments (with discount support)
- `discount_codes` (+ campaigns) — promo codes, once-per-member enforcement
- `marketing_emails_sent` — email idempotency (UNIQUE on member_id + email_type)
- `studio_settings`, `member_email_templates`, `rent_ledger`

RLS policies are defined and revised across migrations `006`, `007`, `028` (`is_admin` includes superadmin), etc.

## Environment & secrets

Set these in `.env` (local) / `.env` on the VPS via `env_file` (`docker-compose.yml`). **NEVER commit real values.** `.env.production` in the repo currently contains live-looking secrets — do not print, copy, or echo its contents. Templates: `.env.example`. Variable **names only** below.

**App**
- `NODE_ENV`
- `NEXT_PUBLIC_BASE_URL`
- `STUDIO_TIMEZONE` (e.g. `America/New_York`)
- `NEXT_PUBLIC_GSC_VERIFICATION` (optional SEO)
- `NEXT_PUBLIC_GA_ID` (optional analytics)
- `NEXT_PUBLIC_STRIPE_ENABLED` (build arg; defaults `true`)
- `NEXT_PUBLIC_SITE_URL` (referenced in code)

**Supabase**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Stripe**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Price IDs: `STRIPE_INTRO_PRICE_ID`, `STRIPE_DROPIN_PRICE_ID`, `STRIPE_SUBSCRIPTION_PRICE_ID`, `STRIPE_4PACK_PRICE_ID`, `STRIPE_5PACK_PRICE_ID`, `STRIPE_8PACK_PRICE_ID`, `STRIPE_10PACK_PRICE_ID`, `STRIPE_12PACK_PRICE_ID` (the pack price IDs actually consumed by code are referenced in `src/app/api/packs/checkout/route.ts` and `src/app/api/gift-packs/checkout/route.ts`; `.env.production` currently defines INTRO/DROPIN/4PACK/8PACK/12PACK/SUBSCRIPTION — keep env and code in sync)

**Resend (email)**
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO` (referenced in code)

**SignWell (waivers, optional)**
- `SIGNWELL_API_KEY`
- `SIGNWELL_WAIVER_TEMPLATE_ID`
- `SIGNWELL_WEBHOOK_SECRET`

**Other**
- `GOOGLE_PLACE_ID` (used for review links)
- `EMAIL_TEST_SECRET` (guards an email test endpoint)
- `CRON_SECRET` (guards all `/api/cron/*` endpoints — see below)

## Cron / scheduled jobs

There is no in-app scheduler. Cron jobs are **external** — a crontab on the VPS calls the endpoints over HTTP. Each endpoint is a `GET` guarded by `?key=$CRON_SECRET` (returns 403 on mismatch) and is idempotent.

| Endpoint | Purpose | Suggested cadence |
|---|---|---|
| `GET /api/cron/class-reminders?key=$CRON_SECRET` | 24h class reminder emails (gated by `bookings.reminder_sent_at`) | every 15–60 min |
| `GET /api/cron/cleanup-pending?key=$CRON_SECRET` | Calls `cleanup_pending_bookings` RPC to expire stale pending bookings | frequent (e.g. every 15 min) |
| `GET /api/cron/review-requests?key=$CRON_SECRET` | Review-request email 2–24h after a member's first confirmed class (idempotent via `marketing_emails_sent`) | hourly |

Trigger example (as documented in the route source):

```bash
curl -fsS "https://www.maningomethod.com/api/cron/class-reminders?key=$CRON_SECRET"
```

## Day-to-day cheat sheet

```bash
# Run locally
npm run dev

# Pre-deploy gate (lint + test + build)
npm run predeploy

# Deploy on VPS (rebuild image, recreate container)
docker compose -f /opt/maningo-method/docker-compose.yml up -d --build

# Tail container logs
docker logs -f maningo_app

# Restart after an env_file-only change (no rebuild)
docker compose -f /opt/maningo-method/docker-compose.yml restart

# Health check (local + public)
curl http://localhost:3003/api/health
curl https://maningo.hosthampton.com/api/health

# Manually trigger a cron job (substitute the real secret from .env)
curl -fsS "https://www.maningomethod.com/api/cron/cleanup-pending?key=$CRON_SECRET"
```

## Key files

- `docker-compose.yml` — container `maningo_app`, port `3003:3000`, `maningo_net` + external `hampton_nginx` network
- `Dockerfile` — 3-stage build (deps → builder → runner); `NEXT_PUBLIC_*` baked in via build args; standalone output runs `node server.js`
- `next.config.mjs` — `output: 'standalone'`; keeps `resend` / `@react-email/*` external from the server bundle (avoids a runtime minifier bug)
- `nginx/maningo.conf` — reverse-proxy server block to install into `/opt/hosthampton` nginx
- `.env.example` — env template; `.env.production` — populated env (contains live secrets, do not print)
- `supabase/migrations/` + `supabase/all_migrations.sql` — schema; `supabase/config.toml` — local Supabase config
- `src/app/` — App Router; route groups `(admin)`, `(auth)`, `(student)`; API under `src/app/api/`; SEO routes `robots.ts`, `sitemap.ts`, location landing pages
- `src/app/api/cron/` — the three scheduled endpoints
- `src/lib/` — domain logic: `stripe.ts`/`stripe-client.ts`, `supabase/` clients (incl. `admin.ts`), `resend.ts`, `pricing.ts`, `credits.ts`, `referrals.ts`, `gift-codes.ts`, `marketing/`, `timezone.ts`, `signwell.ts`, `logger.ts`
- `src/middleware.ts` — auth/session middleware
- `scripts/` — operational helpers: `seed-classes.mjs`, `seed-superadmin.mjs`, `setup-stripe-products.mjs`, `promote-admin.sql`, `backfill-orphan-profiles.mjs`, `clear-revenue.mjs`, `run-migrations.mjs`
- `build-plan/` — original spec, phase plans, and quick reference

## Gotchas / operational rules

- **Never print or commit secrets.** `.env.production` and `scripts/run-migrations.mjs` contain real-looking Supabase service-role keys and Stripe keys. Do not echo, cat, or paste their values. `.gitignore`/`.dockerignore` should keep `.env*` out of images — verify before building.
- **`NEXT_PUBLIC_*` is build-time.** Changing any public env var (Supabase URL/anon key, Stripe publishable key, base URL, GA/GSC) requires a full `--build` rebuild, not just `restart`. They are passed as Docker build args in `docker-compose.yml`.
- **Cron endpoints are unauthenticated except for `CRON_SECRET`.** Anyone with the secret can trigger emails/cleanup. Keep `CRON_SECRET` strong and out of logs/URLs in shared terminals.
- **Cron jobs are idempotent by design** (`reminder_sent_at`, `marketing_emails_sent` unique constraint, `processed_events`). Re-running them is safe but rely on the DB guards rather than disabling them.
- **Migrations are not auto-applied.** Apply new `supabase/migrations/*.sql` manually (and update `all_migrations.sql`). Don't trust `run-migrations.mjs` to be complete — it only lists the first six migrations.
- **RLS is on.** Server-side privileged work uses the service-role admin client (`src/lib/supabase/admin.ts`); never ship the service-role key to the browser.
- **Shared proxy network.** The `hampton_nginx` network is `external: true` and owned by the hosthampton compose project (`hosthampton_hampton_net`). It must already exist on the VPS or `docker compose up` will fail.
- **`nginx/maningo.conf` is a template** for the host-hampton nginx config; the proxy points at `host.docker.internal:3003`. Changes there must be applied in `/opt/hosthampton`, not in this repo's container.
- **Resend SDK quirk:** `resend` and `@react-email/*` are kept external in `next.config.mjs`. If you change bundling/build config, keep that exclusion or email rendering can fail at runtime ("t is not a function").
- **Run `npm run predeploy` before deploying** — there's no CI to catch lint/test/build failures for you.
