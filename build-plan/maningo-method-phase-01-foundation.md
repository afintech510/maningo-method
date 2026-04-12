# Phase 01: Schema & Auth Foundation
**Project:** Maningo Method
**Spec:** maningo-method-spec-v2.md
**Build Plan:** maningo-method-buildplan.md
**Prerequisites:** Phase 00 complete
**Implements:** F-002 (Student account creation)
**Recommended:** `claude --max-turns 50`

---

## 1. Context

You are executing **Phase 01: Schema & Auth Foundation** of the Maningo Method build.

**Your scope is strictly this phase.** Build the database schema, RLS policies, auth flow, and shared UI components. Do NOT build booking logic, payment integration, schedule pages, or admin panels.

**Tech Stack:** Next.js 14 (App Router), Supabase (PostgreSQL + Auth), Tailwind CSS, Zod, pino
**Working Directory:** Project root
**Spec File:** `maningo-method-spec-v2.md` — READ THIS FILE FIRST. Sections 2 (all), 7 (all), 3.1 (API conventions), 4.5 (mobile-first UI).

## Skills Reference (read before building)
Before building any UI components, `view /mnt/skills/public/frontend-design/SKILL.md` and follow its design principles. This is a mobile-first application — auth forms must be optimized for phone screens.

### What Already Exists
Phase 00 created: Next.js project scaffolding, Docker config, Supabase initialization, all lib utilities (logger, timezone, supabase clients, stripe, resend), root layout with fonts, Tailwind config with mobile breakpoints, directory structure.

### What You're Building
The complete database schema (6 migrations), Supabase Auth integration, auth pages (mobile-first login/register/forgot-password), auth middleware, role-based route protection, and shared feedback/navigation UI components.

---

## 2. Objective & Deliverables

### Objective
After this phase, the data model supports all features (classes, bookings, subscriptions, events tracking) and users can register, log in, reset passwords, and be authorized by role. The mobile bottom navigation renders on all student pages.

### Deliverables
1. **Migration 001** — profiles table + auth trigger + stripe_customer_id — Spec Section 2.2
2. **Migration 002** — classes table (with 'completed' status) — Spec Section 2.2
3. **Migration 003** — bookings table + create_booking RPC + cleanup_pending_bookings fn — Spec Section 2.2
4. **Migration 004** — subscriptions table — Spec Section 2.2
5. **Migration 005** — processed_stripe_events table — Spec Section 2.2
6. **Migration 006** — All RLS policies (exact SQL from spec) — Spec Section 2.2
7. **Admin promotion script** — `scripts/promote-admin.sql` — Spec Section 2.4
8. **Login page** — `src/app/(auth)/login/page.tsx` + `LoginForm` — mobile-first — Spec Section 4.4, 4.5.4
9. **Register page** — `src/app/(auth)/register/page.tsx` + `RegisterForm` — Spec Section 4.4, 4.5.4
10. **Forgot password page** — `src/app/(auth)/forgot-password/page.tsx` — Spec Section 4.4
11. **Auth middleware** — Session extraction + role checking — Spec Section 7.1, 7.2
12. **AuthGuard component** — `src/components/auth/AuthGuard.tsx` — Spec Section 4.2
13. **Student layout** — `src/app/(student)/layout.tsx` — Auth-protected, includes MobileNav
14. **Admin layout** — `src/app/(admin)/layout.tsx` — Admin-protected
15. **MobileNav** — `src/components/layout/MobileNav.tsx` — Bottom tab bar — Spec Section 4.5.3
16. **Header** — `src/components/layout/Header.tsx` — Spec Section 4.1
17. **Feedback components** — Skeleton, EmptyState, ErrorMessage, Toast — Spec Section 4.2
18. **UI primitives** — Button, Input, Card, Badge, Modal — Spec Section 4.2
19. **Zod schemas** — `src/validations/auth.ts` — registration + login validation

---

## 3. Implementation Instructions

### Task 1: Database Migrations
**Spec Reference:** Section 2.2 (all table definitions), Section 2.3 (migration strategy)
**Creates:** `supabase/migrations/001_create_profiles.sql` through `006_rls_policies.sql`, `scripts/promote-admin.sql`

Create all 6 migrations. Copy the SQL from the spec EXACTLY — column names, types, constraints, defaults, FK references with ON DELETE CASCADE, indexes, CHECK constraints, triggers, RPC functions.

**CRITICAL items to get right:**
- `profiles.id` FK → `auth.users.id` **ON DELETE CASCADE**
- `profiles.stripe_customer_id` — nullable, unique where not null
- `bookings.status` CHECK includes `'pending'`, `'confirmed'`, `'cancelled'`, `'expired'`
- `bookings` FK columns have ON DELETE CASCADE
- `create_booking()` RPC accepts `p_student_id uuid DEFAULT NULL` parameter (REV-001 fix)
- `create_booking()` counts both `'pending'` AND `'confirmed'` bookings for capacity (REV-002)
- `create_booking()` checks max 5 concurrent future bookings for subscribers (REV-017)
- `cleanup_pending_bookings()` function expires pending > 15 minutes
- `classes.status` CHECK includes `'completed'`
- RLS policy on profiles UPDATE has `WITH CHECK (role = 'student')` — PREVENTS role escalation (REV-004)
- `processed_stripe_events` table with `event_id TEXT PK`

Run `supabase db push` (or `supabase migration up` in local dev) to verify all migrations apply cleanly.

### Task 2: Auth Configuration
**Spec Reference:** Section 5.3, 7.1
**Creates:** Auth configuration, middleware

Configure Supabase Auth for email/password signup. The sign-up flow passes `full_name` in `raw_user_meta_data`. The `handle_new_user()` trigger in migration 001 auto-creates the profile.

Create auth middleware: a utility function that:
1. Extracts the Supabase session from the request (via `@supabase/ssr` server client)
2. Returns the user and their profile (including role)
3. Returns null if no valid session

Create a `requireAuth(role?: 'student' | 'admin')` wrapper that returns 401/403 as appropriate.

### Task 3: Auth Pages (Mobile-First)
**Spec Reference:** Section 4.5.4 (Auth Forms Mobile)
**Creates:** Login, Register, Forgot Password pages + form components

**Mobile form requirements (from spec Section 4.5.4):**
- Single column, max-width 100%
- Input fields: 48px height, 16px font size (prevents iOS auto-zoom), rounded corners
- Submit button: full-width, 48px height, at bottom of form
- "Already have an account? Log in" / "New here? Sign up" links below submit
- Password field: show/hide toggle
- All inputs have: `inputmode` attributes, `autocomplete` attributes, associated `<label>` elements
- Keyboard-aware: form shouldn't be hidden by mobile keyboard

**Login form:** email + password + submit + "forgot password?" link + "sign up" link.
**Register form:** full name + email + password + confirm password + submit + "log in" link.
**Forgot password:** email + submit. Uses Supabase's built-in magic link flow.

Use Zod schemas from `src/validations/auth.ts` for client-side validation. Show inline per-field errors.

**REV-003:** On password change, call `supabase.auth.signOut({ scope: 'global' })` to revoke all sessions. Redirect to login with "Password changed successfully" message.

### Task 4: Route Protection & Layouts
**Spec Reference:** Section 4.4, 4.5.3, 7.2
**Creates:** Student layout, Admin layout, AuthGuard component

**Student layout** (`src/app/(student)/layout.tsx`):
- Server-side auth check. If no session → redirect to `/login`.
- Renders MobileNav at bottom.
- Wraps children with padding for bottom nav safe area.

**Admin layout** (`src/app/(admin)/layout.tsx`):
- Server-side auth check. If no session → redirect to `/login`. If role !== 'admin' → redirect to `/dashboard` or show 403.
- Renders admin-specific bottom nav (mobile) or sidebar (desktop).

**AuthGuard** component: client-side wrapper for components that need auth state (e.g., booking buttons that change based on login status).

### Task 5: Mobile Navigation
**Spec Reference:** Section 4.5.3
**Creates:** `MobileNav.tsx`, `AdminSidebar.tsx`

**Bottom tab bar (MobileNav):**
- Fixed at viewport bottom, 56px height
- 4 tabs: Schedule (calendar icon), My Classes (bookmark), Subscribe (star), Profile (user)
- Active state: filled icon + label. Inactive: outline icon, no label.
- `env(safe-area-inset-bottom)` padding for notched phones
- Hide on scroll-down, show on scroll-up (use IntersectionObserver or scroll event)
- Only visible below `lg:` breakpoint. Desktop uses Header nav.

**AdminSidebar:** Desktop sidebar for admin pages. On mobile, uses a bottom nav with: Classes, Students, Settings tabs.

### Task 6: Shared UI Components
**Spec Reference:** Section 4.2, 4.5.7 (accessibility)
**Creates:** All components in `src/components/ui/` and `src/components/feedback/`

**UI Primitives:**
- `Button` — variants: primary, secondary, destructive, ghost. Sizes: sm, md, lg. Props: loading (shows spinner + disabled), disabled. Min 44×44px touch target on mobile.
- `Input` — Props: label, error, type, inputMode, autoComplete. 48px height, 16px font. Error message linked via `aria-describedby`.
- `Card` — Container with border, rounded corners, padding. Full-width on mobile.
- `Badge` — Variants: success (green), warning (amber), error (red), neutral (gray). For subscription status, spots remaining.
- `Modal` — On mobile, renders as a bottom sheet (slides up from bottom). On desktop, centered modal. Backdrop tap to close. Trap focus.

**Feedback Components:**
- `Skeleton` — Variants: card (full ClassCard placeholder), row (table row), text (paragraph lines). Pulse animation.
- `EmptyState` — Props: icon, title, description, ctaLabel, ctaHref. Centered layout.
- `ErrorMessage` — Takes error code from spec Section 8.1, renders user-friendly message. Includes retry button if the error is retryable.
- `Toast` — Transient notification. Props: message, type (success/error). Auto-dismiss 3s. Positioned above bottom nav on mobile.

All interactive components: 44×44px touch targets, focus rings, aria-labels on icon-only elements.

### Task 7: Validation Schemas
**Spec Reference:** Section 7.4
**Creates:** `src/validations/auth.ts`

Zod schemas for:
- `registerSchema`: full_name (1-100 chars), email (valid email), password (min 8 chars), confirmPassword (matches password)
- `loginSchema`: email (valid email), password (required)
- `forgotPasswordSchema`: email (valid email)

Export these for use in both client forms and server API routes.

### Task 8: Placeholder Pages
**Creates:** Placeholder pages for routes that exist but will be built in later phases

Create minimal placeholder pages so the route structure works:
- `src/app/(student)/dashboard/page.tsx` → "Dashboard coming in Phase 3"
- `src/app/(student)/subscription/page.tsx` → "Subscription coming in Phase 2b"
- `src/app/schedule/page.tsx` → "Schedule coming in Phase 2a"
- `src/app/(admin)/admin/page.tsx` → "Admin coming in Phase 4"

These let navigation work end-to-end even before features are built.

---

## 4. Acceptance Criteria

### Automated Checks
- [ ] All 6 migrations apply cleanly: `supabase db push` returns success
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Functional Checks
- [ ] User can register with email, password, full_name → profile auto-created with role='student'
- [ ] User can log in with email + password → redirected to /dashboard
- [ ] User can log out → redirected to /login
- [ ] Forgot password sends reset link (verify Supabase sends email)
- [ ] Accessing /dashboard without auth → redirected to /login
- [ ] Accessing /admin as student → 403 or redirect
- [ ] RLS test: `UPDATE profiles SET role='admin' WHERE id='[student-id]'` FAILS when executed as that student's session (WITH CHECK blocks it)
- [ ] `create_booking()` RPC works when called with explicit `p_student_id` parameter (simulates webhook context)
- [ ] `cleanup_pending_bookings()` expires a pending booking older than 15 minutes

### UI Checks
- [ ] Login form renders correctly at 375px (48px inputs, full-width button, no horizontal scroll)
- [ ] Register form: all inputs have labels, inputmode, autocomplete attributes
- [ ] MobileNav renders at bottom on mobile, hidden on desktop
- [ ] Bottom nav tabs navigate to correct routes
- [ ] Button loading state shows spinner + disabled
- [ ] Toast appears above bottom nav on mobile
- [ ] Modal/bottom sheet renders as bottom sheet on mobile
- [ ] All touch targets ≥ 44×44px

---

## 5. Constraints

### Hard Constraints
- Database schema MUST match spec Section 2.2 exactly. Column names, types, constraints.
- RLS policies MUST include WITH CHECK clauses from spec. No shortcuts.
- Auth flow uses Supabase Auth only — no custom JWT, no NextAuth.
- Mobile-first: base styles are mobile, scale up with sm/md/lg.
- 16px minimum font on form inputs (prevents iOS zoom).
- Do NOT implement booking flow, payment, schedule, or admin features.

### Soft Constraints
- Follow font choices made in Phase 00 root layout.
- Use the logger (pino) for any server-side operations.
- If a UI component needs a pattern not in the spec, make a reasonable choice and mark with `// SPEC-AMBIGUITY`.

---

## 6. Completion Protocol

When all acceptance criteria pass, provide:

### Files Created
| File | Purpose | Lines |

### Files Modified
| File | Changes | Why |

### Acceptance Criteria Results
| # | Criterion | Result | Evidence |

### Spec Ambiguities
| Location | Ambiguity | Decision Made | Rationale |

### Blocked Items
| Task | Blocker | Required From |

### Decisions Made
[Implementation choices not explicitly covered by spec]

### Warnings for Next Phase
[Patterns to follow, gotchas, setup needed for Phase 2a/2b]

---

## 7. Execution & Orchestration

### Run Configuration
**Recommended:** `claude --max-turns 50`

### Task Planning
1. Read spec Sections 2 (all), 7 (all), 3.1, 4.2, 4.5
2. Read frontend-design skill
3. Survey existing project structure from Phase 00
4. Execute Tasks 1-8 sequentially (migrations first, then auth, then UI)
5. Run all acceptance checks

### Resumption Protocol (--continue)
If resuming: read this prompt → check filesystem for completed migrations and components → read `PHASE-01-PROGRESS.md` → resume from first incomplete task.

### Progress Tracking
After each major task, update `PHASE-01-PROGRESS.md` with task status.
