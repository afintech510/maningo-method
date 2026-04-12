# Phase 02a: Schedule & Booking
**Project:** Maningo Method
**Spec:** maningo-method-spec-v2.md
**Build Plan:** maningo-method-buildplan.md
**Prerequisites:** Phase 01 complete
**Implements:** F-001 (Public schedule), F-003 (Class booking), F-006 (Capacity enforcement), F-012 (Booking cancellation)
**Recommended:** `claude --max-turns 75`

---

## 1. Context

You are executing **Phase 02a: Schedule & Booking** of the Maningo Method build.

**Your scope:** Public class schedule, booking creation (subscription path confirmed immediately; drop-in path creates pending booking + placeholder for Stripe URL), booking cancellation, capacity enforcement, pending cleanup cron. Do NOT implement Stripe payment processing, webhooks, subscription management, email sending, or admin endpoints.

**Tech Stack:** Next.js 14, Supabase, Tailwind, Zod
**Spec File:** `maningo-method-spec-v2.md` — Sections 3.2 (Classes, Bookings endpoints), 4.5.4 (mobile schedule/booking UI), 2.2 (create_booking RPC).

## Skills Reference (read before building)
Before building any UI, `view /mnt/skills/public/frontend-design/SKILL.md`. This is a **mobile-first booking app** — the schedule page is the core product experience. Make it beautiful and fast on a phone.

### What Already Exists
- Phase 00: Project scaffolding, all lib utilities, root layout, Tailwind config
- Phase 01: All database tables/migrations, RLS policies, auth pages, auth middleware, MobileNav, Header, all UI primitives (Button, Input, Card, Badge, Modal), feedback components (Skeleton, EmptyState, ErrorMessage, Toast), Zod auth schemas, student/admin layouts, placeholder pages

### What You're Building
The public schedule browsing experience (mobile-first with day picker), the booking flow (instant for subscribers, pending creation for drop-ins), booking cancellation, and the pending booking cleanup job.

---

## 2. Objective & Deliverables

### Objective
After this phase, students can browse the class schedule on their phone, book classes (subscribers get instant confirmation), cancel bookings, and see accurate spot counts. Drop-in users can initiate a booking (pending state) but actual payment integration comes in Phase 2b.

### Deliverables
1. `GET /api/classes` — with spots_remaining counting pending + confirmed — Spec Section 3.2
2. `GET /api/classes/[id]` — Spec Section 3.2
3. `POST /api/bookings` — subscription path = confirmed; drop-in path = pending + placeholder checkout_url — Spec Section 3.2
4. `PATCH /api/bookings/[id]` — cancel (no email trigger yet — Phase 3) — Spec Section 3.2
5. `GET /api/bookings` — with end-time visibility logic — Spec Section 3.2
6. `GET /api/cron/cleanup-pending` — calls cleanup_pending_bookings() RPC — Spec Section 3.2
7. Schedule page (`/schedule`) — mobile-first, day picker, ClassCard list — Spec Section 4.5.4
8. ClassCard component — time, title, spots, Book button — Spec Section 4.5.4
9. ClassSchedule component — schedule list with day filtering
10. SpotsIndicator component — visual dots + number — Spec Section 4.2
11. BookingButton — all states (book, processing, booked, full, pending) — Spec Section 4.2, 4.5.4
12. Booking flow: bottom sheet for drop-in confirmation — Spec Section 4.5.4
13. Booking list on student dashboard (update the placeholder page) — basic list of upcoming bookings
14. `src/validations/booking.ts` — Zod schemas for booking endpoints

---

## 3. Implementation Instructions

### Task 1: API Routes — Classes
**Spec Reference:** Section 3.2 (Classes Public)
**Creates:** `src/app/api/classes/route.ts`, `src/app/api/classes/[id]/route.ts`

`GET /api/classes`: Query classes WHERE status = 'scheduled' AND starts_at within date range. For each class, compute `spots_remaining = max_capacity - COUNT(bookings WHERE status IN ('pending', 'confirmed'))`. Use a single query with LEFT JOIN and GROUP BY, not N+1.

`GET /api/classes/[id]`: Same shape, single class.

Both public (no auth required). Use logger for request timing.

### Task 2: API Routes — Bookings
**Spec Reference:** Section 3.2 (Bookings)
**Creates:** `src/app/api/bookings/route.ts`, `src/app/api/bookings/[id]/route.ts`, `src/app/api/cron/cleanup-pending/route.ts`

**POST /api/bookings:** Requires auth. Validate with Zod. Two paths:
1. `subscription`: Check active subscription (status='active' AND current_period_end covers class start). Call `create_booking()` RPC with `p_status='confirmed'`. Return booking.
2. `drop_in`: Call `create_booking()` RPC with `p_status='pending'`. For now, return `{ booking_id, checkout_url: '/booking-success?pending=true' }` as placeholder. Phase 2b will replace with real Stripe Checkout URL.

Catch RPC exceptions: CLASS_FULL, ALREADY_BOOKED, CLASS_CANCELLED, MAX_BOOKINGS_REACHED, CLASS_NOT_FOUND → map to error responses per spec Section 8.1.

**GET /api/bookings:** Requires auth. Filter by student_id = current user. For `upcoming=true`, use: `starts_at + (duration_minutes * interval '1 minute') > now()` (class visible until it ENDS, not when it starts — REV-018). JOIN classes table for title, starts_at, duration_minutes.

**PATCH /api/bookings/[id]:** Requires auth. Verify student_id = current user. Only allow status → 'cancelled'. Set cancelled_at = now(). No email trigger here — that's Phase 3.

**GET /api/cron/cleanup-pending:** Requires secret query param (`?key=CRON_SECRET`). Calls `cleanup_pending_bookings()` RPC. Returns `{ expired_count }`.

### Task 3: Validation Schemas
**Creates:** `src/validations/booking.ts`

Schemas:
- `createBookingSchema`: class_id (uuid string), payment_type ('subscription' | 'drop_in')
- `cancelBookingSchema`: status (literal 'cancelled')

### Task 4: Schedule Page (Mobile-First)
**Spec Reference:** Section 4.5.4 (Schedule Page Mobile)
**Creates:** `src/app/schedule/page.tsx`, `src/components/schedule/ClassSchedule.tsx`, `src/components/schedule/ClassCard.tsx`, `src/components/schedule/SpotsIndicator.tsx`

**Day picker:** Horizontal scrolling row of date pills at top. Today highlighted. Tap a date → filter classes to that day. Swipeable. Show day name + date number (e.g., "Tue 15"). Default to today. Render next 14 days.

**Class cards:** Full-width, stacked vertically on mobile. Each card per spec Section 4.5.4 wireframe:
```
┌─────────────────────────────┐
│  9:00 AM          3 spots   │
│  Mat Pilates      ● ● ● ○   │
│  60 min                     │
│  [ Book This Class      → ] │
└─────────────────────────────┘
```

All times rendered in studio timezone (America/New_York) using the timezone utility from Phase 00.

**SpotsIndicator:** Show filled/empty dots (max 5 dots regardless of actual capacity — 5 dots is the visual max). Plus the numeric "X spots" text. Colors: plenty = green, low (≤3) = amber pulse, full = red.

**Empty day:** "No classes on [day]. Check another day!" with prev/next day arrows.

**Loading state:** Skeleton cards while data loads (use Skeleton component from Phase 01).

**Pull-to-refresh:** On the schedule list (optional — if complex, mark as SPEC-AMBIGUITY and skip).

This page is a **Server Component** fetching data on the server. The day picker and booking button are Client Components.

### Task 5: BookingButton Component
**Spec Reference:** Section 4.2, 4.5.4
**Creates:** `src/components/booking/BookingButton.tsx`

States:
- **Default (can book):** "Book This Class →" — primary button, full-width
- **Processing:** spinner + "Booking..." — disabled (REV-026: prevents double-click)
- **Booked:** "Booked ✓" — success variant, disabled
- **Full:** "Class Full" — gray, disabled
- **Pending payment:** "Completing payment..." — amber, disabled
- **Not logged in:** "Log in to Book" — links to `/login?return=/schedule`

On tap (subscriber): optimistic UI — show "Booked ✓" immediately, call POST /api/bookings in background. On error, revert to default + show Toast error.

On tap (drop-in): open bottom sheet "Drop-in: $35. Pay now to reserve your spot." with "Pay $35" button. Phase 2b will wire this to Stripe Checkout. For now, tapping "Pay $35" creates the pending booking and shows a placeholder success state.

### Task 6: Booking Flow Bottom Sheet
**Creates:** Part of BookingButton / separate component

On mobile, the drop-in confirmation uses a bottom sheet (the Modal component from Phase 01 renders as bottom sheet on mobile). Contains:
- Class title + date/time
- "$35 drop-in"
- "Pay $35" button (full-width, primary)
- "Cancel" text link

### Task 7: Dashboard Booking List
**Creates:** Update `src/app/(student)/dashboard/page.tsx`, `src/components/dashboard/UpcomingBookings.tsx`

Replace placeholder with real data. Fetch GET /api/bookings (upcoming, confirmed). Display as cards:
- Date + time (studio timezone)
- Class title
- Cancel button (triggers PATCH with confirmation bottom sheet)

Empty state: "No upcoming classes — browse the schedule!" with CTA to /schedule.

Cancel confirmation bottom sheet: "Cancel your booking for [title] on [date]?" + "Yes, Cancel" (destructive) + "Keep Booking" button.

---

## 4. Acceptance Criteria

- [ ] Schedule page loads and displays classes for today with correct spots
- [ ] Day picker: tapping a different date shows that day's classes
- [ ] All times displayed in Eastern timezone (verify with UTC class time)
- [ ] Spots count includes pending + confirmed bookings
- [ ] Subscriber can book → status='confirmed', spot decremented, card shows "Booked ✓"
- [ ] Drop-in can initiate → status='pending', card shows pending state
- [ ] Booking same class twice → ALREADY_BOOKED error
- [ ] Full class → "Class Full" button, booking returns CLASS_FULL
- [ ] Subscriber with 5 future bookings → MAX_BOOKINGS_REACHED error
- [ ] Student can cancel → status='cancelled', spot freed
- [ ] Cleanup cron: pending booking >15 min → expired
- [ ] Dashboard shows upcoming bookings (class visible until it ends)
- [ ] Dashboard empty state renders correctly
- [ ] Mobile (375px): no horizontal scroll, cards full-width, bottom nav visible
- [ ] BookingButton disabled immediately on tap (no double-click)
- [ ] Loading skeletons shown while fetching schedule data
- [ ] All error responses use format from spec Section 8.1

---

## 5. Constraints

### Hard Constraints
- spots_remaining MUST count both pending + confirmed (REV-002)
- Upcoming bookings MUST use end-time logic: `starts_at + duration > now()` (REV-018)
- Max concurrent subscriber bookings: 5 (enforced by RPC)
- Studio timezone for all displayed times (REV-014)
- Mobile-first: base styles = mobile, scale up
- Do NOT implement Stripe Checkout, webhooks, email sending, or admin features

### Soft Constraints
- Use Server Components for data fetching where possible
- Use optimistic UI for booking actions
- Follow patterns from Phase 01 (same validation approach, same error handling, same component structure)

---

## 6. Completion Protocol
[Standard completion report: Files Created, Modified, Criteria Results, Ambiguities, Blocked Items, Decisions, Warnings for Next Phase]

---

## 7. Execution & Orchestration

**Recommended:** `claude --max-turns 75`

### Task Planning
1. Read spec Sections 3.2 (Classes, Bookings), 4.5.4, 2.2 (create_booking RPC)
2. Read frontend-design skill
3. Survey Phase 01 output (components, layouts, middleware)
4. Build API routes first (Tasks 1-3), then UI (Tasks 4-7)

### Resumption Protocol
If resuming: read prompt → check API routes + components → read `PHASE-02A-PROGRESS.md` → resume.

### Progress Tracking
Update `PHASE-02A-PROGRESS.md` after each task.
