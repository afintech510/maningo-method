# Maningo Method

Class booking and membership platform for a Pilates studio. Students browse the
schedule, book or buy class packs, and manage their own bookings; instructors and
admins manage classes, capacity, and gift certificates.

## Stack

Next.js (App Router) · TypeScript · Supabase (Postgres + SSR auth) · Stripe for
payments · React Email + Resend for transactional mail · Zod validation · pino
logging · Docker + nginx

## What's interesting here

- **Route groups mirror the three audiences.** `(student)`, `(admin)` and `(auth)`
  segment the App Router tree, so access rules and layouts are enforced structurally
  rather than by scattered per-page checks.
- **Timezone correctness.** Class times use `date-fns-tz` throughout. A studio
  schedule that shifts by an hour twice a year is a real booking bug, not a cosmetic
  one.
- **Per-class direct booking links** (`/class/[id]`) so the studio can point a QR
  code or a social post straight at a single session.
- **Emails as versioned components.** Transactional mail is built with React Email
  rather than inline HTML strings, so templates are reviewable and testable.
- **Local SEO landing pages** (e.g. `/pilates-in-east-quogue`) targeting the towns
  the studio actually draws from.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

```bash
npm test                                          # unit tests
node --env-file=.env scripts/run-migrations.mjs   # apply Supabase migrations
```

All credentials come from the environment. Nothing is hardcoded, and `.env*` files
are gitignored.

## Layout

```
src/app/(student)/   booking, schedule, account
src/app/(admin)/     class and capacity management
src/app/api/         route handlers, Stripe webhooks
supabase/            schema and migrations
scripts/             migrations, seeding, Stripe product setup
build-plan/          phased build documentation
```
