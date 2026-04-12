# Phase 00: Environment Setup
**Project:** Maningo Method
**Spec:** maningo-method-spec-v2.md
**Build Plan:** maningo-method-buildplan.md
**Prerequisites:** None
**Implements:** Infrastructure
**Recommended:** `claude --max-turns 25`

---

## 1. Context

You are executing **Phase 00: Environment Setup** of the Maningo Method build.

**Your scope is strictly this phase.** Do not implement features, database tables, auth flows, or UI pages. Only scaffolding, configuration, and utilities.

**Tech Stack:** Next.js 14 (App Router, TypeScript, Tailwind CSS), Supabase, Stripe, Resend, pino, Docker, nginx
**Working Directory:** `/opt/maningo-method/` (or current working directory if local dev)
**Spec File:** `maningo-method-spec-v2.md` — READ THIS FILE FIRST.

### What You're Building
A clean, production-ready project scaffold for a Pilates class booking platform. Every library initialized, every config file correct, every utility function ready for feature phases to consume.

## Skills Reference (read before building)
Before starting, `view /mnt/skills/public/frontend-design/SKILL.md` and follow its design principles for the root layout, font selection, and Tailwind configuration. This is a mobile-first application — all base styles target phone viewports.

---

## 2. Objective & Deliverables

### Objective
After this phase, `docker compose up` starts a Next.js app that responds on port 3001, connects to Supabase, and has all utility libraries initialized. The project structure matches spec Section 4.1 exactly.

### Deliverables
1. **Next.js project scaffolding** — TypeScript, Tailwind, App Router — Spec Section 1.2
2. **Docker Compose config** — Single `maningo-method-app` container on port 3001 — Spec Section 1.3
3. **Dockerfile** — Multi-stage build, standalone output, non-root user — Spec Section 1.3
4. **`.env.example`** — All env vars from Spec Section 7.3
5. **Supabase initialization** — `supabase init`, config.toml — Spec Section 2.3
6. **nginx server block** — Route `maningo.hosthampton.com` → port 3001 — Spec Section 1.3
7. **pino logger** — `src/lib/logger.ts` with JSON output, correlation ID support — Spec Section 8.2
8. **Timezone utility** — `src/lib/timezone.ts` — Format dates in America/New_York — Spec Section 3.1
9. **Supabase clients** — `src/lib/supabase/client.ts`, `server.ts`, `admin.ts` — Spec Section 4.1
10. **Stripe utility** — `src/lib/stripe.ts` — Lazy-init pattern — Spec Section 5.1
11. **Resend utility** — `src/lib/resend.ts` — Spec Section 5.2
12. **Tailwind config** — Mobile-first breakpoints (sm:640, md:768, lg:1024) — Spec Section 4.5.2
13. **Root layout** — `src/app/layout.tsx` — Viewport meta, fonts, metadata for "Maningo Method" — Spec Section 4.1
14. **Zod** — Install and confirm available for feature phases
15. **date-fns + date-fns-tz** — Install for timezone rendering

---

## 3. Implementation Instructions

### Task 1: Project Scaffolding
**Creates:** `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`

Initialize Next.js 14 with App Router, TypeScript, Tailwind, ESLint. Configure `next.config.js` for standalone output:
```js
output: 'standalone'
```

Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `stripe`, `resend`, `zod`, `pino`, `date-fns`, `date-fns-tz`.

Tailwind config: set screens per spec Section 4.5.2. Use mobile-first approach.

### Task 2: Docker Configuration
**Creates:** `Dockerfile`, `docker-compose.yml`

Dockerfile: multi-stage (deps → builder → runner). Runner stage uses `node:20-alpine`, non-root user, copies standalone output. Expose port 3001.

docker-compose.yml: single service `maningo-method-app`, build from `.`, port mapping 3001:3001, env_file `.env`, restart `unless-stopped`, memory limit 512MB.

### Task 3: Environment Variables
**Creates:** `.env.example`, `.gitignore`

Document every env var from spec Section 7.3. Include comments explaining each. Ensure `.env` is in `.gitignore`.

### Task 4: Supabase Initialization
**Creates:** `supabase/config.toml`

Run `supabase init`. Configure project ID placeholder. Create empty `supabase/migrations/` directory.

### Task 5: nginx Configuration
**Creates:** `nginx/maningo.conf` (or document as a snippet for the VPS)

Server block: listen 443 ssl, server_name maningo.hosthampton.com, proxy_pass http://localhost:3001. Include standard proxy headers. Reference Cloudflare origin cert paths.

### Task 6: Library Utilities
**Creates:** `src/lib/logger.ts`, `src/lib/timezone.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/stripe.ts`, `src/lib/resend.ts`, `src/lib/utils.ts`

**Logger (pino):** Export a configured pino instance. In API routes, generate correlation ID via `crypto.randomUUID()`, attach to all log calls for that request.

**Timezone:** Export `formatStudioTime(date: Date | string): string` that always returns time in America/New_York regardless of server timezone. Export `STUDIO_TIMEZONE = 'America/New_York'`.

**Supabase clients:**
- `client.ts` — Browser client via `createBrowserClient()` from `@supabase/ssr`
- `server.ts` — Server client via `createServerClient()` with cookie handling
- `admin.ts` — Service role client for webhook handlers (uses `SUPABASE_SERVICE_ROLE_KEY`)

**Stripe:** Lazy-init pattern (do NOT instantiate at import time — documented gotcha for Next.js standalone builds). Export `getStripe()` function.

**Resend:** Simple init with API key from env.

### Task 7: Root Layout & Base Pages
**Creates:** `src/app/layout.tsx`, `src/app/page.tsx`

Root layout: html lang="en", viewport meta with `width=device-width, initial-scale=1, viewport-fit=cover`. Select distinctive fonts per the frontend-design skill (avoid generic Inter/Roboto). Include Supabase auth provider wrapper. Set metadata: title "Maningo Method — Pilates", description.

Root page: placeholder landing page with "Maningo Method" heading and "Coming Soon" text. Enough to verify the app renders.

### Task 8: Directory Structure
**Creates:** Empty directories matching spec Section 4.1

Create the full directory tree: `src/components/ui/`, `src/components/schedule/`, `src/components/booking/`, `src/components/dashboard/`, `src/components/admin/`, `src/components/auth/`, `src/components/layout/`, `src/components/feedback/`, `src/validations/`, `src/emails/`, `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/fixtures/`, `scripts/`.

Add `.gitkeep` files in empty directories.

---

## 4. Acceptance Criteria

- [ ] `npm run build` succeeds without errors (standalone output generated)
- [ ] `docker compose up --build` starts container, app responds on port 3001
- [ ] Root page loads and displays placeholder content
- [ ] `npm run lint` passes with zero warnings
- [ ] Supabase client initializes without error (test with a simple query or connection check in a server component)
- [ ] pino logger outputs JSON to stdout
- [ ] `formatStudioTime(new Date())` returns Eastern time string
- [ ] `.env.example` contains all env vars from spec Section 7.3
- [ ] Directory structure matches spec Section 4.1

---

## 5. Constraints

### Hard Constraints
- Follow spec Section 1.2 stack exactly. No library substitutions.
- Standalone output mode for Next.js (required for Docker).
- Mobile-first Tailwind config (base = mobile, sm/md/lg scale up).
- Do NOT create database tables, auth pages, API routes, or UI components. Only scaffolding and utilities.

### Soft Constraints
- Font selection should follow frontend-design skill principles (distinctive, not generic).
- Logger format should be JSON for eventual structured log aggregation.
- If a utility needs a dependency not listed in spec, install it and document in completion report.

---

## 6. Completion Protocol

When all acceptance criteria pass, provide:

### Files Created
| File | Purpose | Lines |
|------|---------|-------|

### Acceptance Criteria Results
| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|

### Decisions Made
[Any choices not covered by spec]

### Warnings for Next Phase
[Anything Phase 01 needs to know]

---

## 7. Execution & Orchestration

### Run Configuration
**Recommended:** `claude --max-turns 25`

### Task Planning
1. Read spec Sections 1.2, 1.3, 4.1, 4.5.2, 7.3, 8.2
2. Read frontend-design skill
3. Execute tasks 1-8 sequentially
4. Run acceptance checks

### Resumption Protocol (--continue)
If resuming: read this prompt → check filesystem → identify completed tasks → resume from first incomplete → do NOT redo completed work.

### Progress Tracking
After each major task, note progress in `PHASE-00-PROGRESS.md`.
