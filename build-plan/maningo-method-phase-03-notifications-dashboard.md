# Phase 03: Notifications + Student Dashboard
**Project:** Maningo Method
**Spec:** maningo-method-spec-v2.md
**Build Plan:** maningo-method-buildplan.md
**Prerequisites:** Phase 02a and Phase 02b complete
**Implements:** F-007 (Booking confirmation email), F-008 (Student dashboard)
**Recommended:** `claude --max-turns 50`

---

## 1. Context

You are executing **Phase 03: Notifications + Student Dashboard** of the Maningo Method build.

**Your scope:** React Email templates (all 4), Resend integration (single + batch), wiring email triggers into existing booking/webhook flows, completing the student dashboard, subscription management page, and refund report generation for admin class cancellation. Do NOT build admin panel UI or new API endpoints (except refund report helper).

**Spec File:** `maningo-method-spec-v2.md` — Sections 5.2 (Resend), 4.5.4 (mobile dashboard), 3.2 (booking endpoints for email triggers).

## Skills Reference
`view /mnt/skills/public/frontend-design/SKILL.md` before building dashboard UI.

### What Already Exists
- Phase 01: Supabase clients, Resend utility, all feedback components, MobileNav, UI primitives
- Phase 02a: POST/PATCH /api/bookings, GET /api/bookings, schedule page, BookingButton, UpcomingBookings component (basic)
- Phase 02b: Webhook handler (all 6 events), subscription endpoints, subscription page (basic), booking success page

### What You're Building
The email notification layer and the final student-facing dashboard experience.

---

## 2. Objective & Deliverables

1. **React Email templates (4):**
   - `BookingConfirmation.tsx` — class title, date/time (studio TZ), studio address (295 Montauk Hwy, Suite 7, Speonk, NY 11972) (REV-025)
   - `BookingCancellation.tsx` — confirms spot released (REV-020)
   - `ClassCancellation.tsx` — admin cancelled a class you were in
   - `SubscriptionBookingsCancelled.tsx` — sub lapsed, lists affected future classes (REV-008)
2. **Resend integration:** single send for booking confirm/cancel, **Batch API** for class cancellation (REV-021)
3. **Wire email triggers** into existing code:
   - POST /api/bookings (confirmed) → BookingConfirmation
   - PATCH /api/bookings/[id] (cancelled) → BookingCancellation
   - Webhook: subscription.deleted/invoice.payment_failed → SubscriptionBookingsCancelled
   - (ClassCancellation wired in Phase 04 admin cancel endpoint)
4. **Student dashboard** — complete mobile-first implementation — Spec Section 4.5.4
5. **Subscription page** — finalize with all 3 states — Spec Section 4.5.4
6. **Refund report helper** — function that compiles drop-in refund data and sends to admin email (REV-022, used by Phase 04)

---

## 3. Implementation Instructions

### Task 1: React Email Templates
**Creates:** 4 files in `src/emails/`

Use React Email JSX components. Each template is mobile-friendly (600px max-width, inline styles). Include:
- Maningo Method branding (name, color scheme from root layout)
- Class details where relevant (title, date/time in Eastern, duration)
- Studio address in BookingConfirmation: **295 Montauk Highway, Suite 7, Speonk, NY 11972**
- Clear CTAs where needed ("View My Classes" linking to /dashboard)

`SubscriptionBookingsCancelled.tsx`: accepts a list of cancelled bookings. Renders each with class title + date. Includes "Your subscription has lapsed. Resubscribe to keep booking." CTA.

### Task 2: Resend Integration
**Modifies:** `src/lib/resend.ts`

Add helper functions:
- `sendBookingConfirmation(to, bookingData)` — single send
- `sendBookingCancellation(to, bookingData)` — single send
- `sendClassCancellationBatch(recipients[])` — **Resend Batch API** (single network request for all recipients) (REV-021)
- `sendSubscriptionBookingsCancelled(to, cancelledBookings[])` — single send
- `sendRefundReport(adminEmail, refundData[])` — sends to admin with drop-in student names, emails, payment_intent_ids, amounts (REV-022)

All sends are fire-and-forget with error logging. Never block the API response on email delivery.

### Task 3: Wire Email Triggers
**Modifies:** `src/app/api/bookings/route.ts` (POST), `src/app/api/bookings/[id]/route.ts` (PATCH), `src/app/api/webhooks/stripe/route.ts`

- After confirmed booking (subscription path in POST): call `sendBookingConfirmation()`.
- After webhook confirms drop-in booking (checkout.session.completed payment mode): call `sendBookingConfirmation()`.
- After cancel (PATCH): call `sendBookingCancellation()`.
- After subscription.deleted/invoice.payment_failed cancels future bookings: call `sendSubscriptionBookingsCancelled()` with the list of cancelled bookings.

### Task 4: Student Dashboard (Final)
**Modifies:** `src/app/(student)/dashboard/page.tsx`, `src/components/dashboard/UpcomingBookings.tsx`, `src/components/dashboard/SubscriptionStatus.tsx`

Complete the dashboard per spec Section 4.5.4 wireframe. Server Component for data fetch. Content:
- **Upcoming bookings** list (cards with date, time, title, cancel button)
- **Subscription status** card (active green / past_due amber / none → subscribe CTA)
- Cancel flow: confirmation bottom sheet → PATCH → toast "Booking cancelled" → revalidate

Empty state: illustration + "No upcoming classes" + "Browse Schedule" CTA.

### Task 5: Subscription Page (Final)
**Modifies:** `src/app/(student)/subscription/page.tsx`

Finalize with all 3 states per Phase 02b Task 6, now with real data and polished mobile UI.

### Task 6: Refund Report Helper
**Creates:** Helper function in `src/lib/resend.ts` or `src/lib/admin-helpers.ts`

`generateRefundReport(classId)`: queries all confirmed drop-in bookings for the class, compiles: student_name, student_email, stripe_payment_intent_id, amount_paid_cents. Returns the data structure AND sends it as an email to the admin. This function is called from Phase 04's admin class cancel endpoint.

---

## 4. Acceptance Criteria

- [ ] Booking (subscription) triggers confirmation email within 60 seconds. Email includes studio address.
- [ ] Booking (drop-in, after webhook) triggers confirmation email
- [ ] Student cancellation triggers cancellation confirmation email
- [ ] Subscription loss cancels bookings AND sends SubscriptionBookingsCancelled email with affected class list
- [ ] Dashboard: shows upcoming bookings accurately, correct empty state
- [ ] Dashboard: subscription status shows correct state (none/active/past_due)
- [ ] Dashboard: cancel flow works — bottom sheet → confirm → toast → booking removed from list
- [ ] Subscription page: 3 states render correctly
- [ ] Refund report function returns correct data for a class with drop-in bookings
- [ ] All email templates render without errors (unit test)
- [ ] Mobile (375px): dashboard cards full-width, cancel button accessible, no horizontal scroll
- [ ] Emails are fire-and-forget — API responses not delayed by email delivery

---

## 5. Constraints

### Hard Constraints
- Class cancellation emails use Resend Batch API (REV-021), not sequential sends
- Booking confirmation email includes studio physical address (REV-025)
- Student cancellation sends email (REV-020)
- Email delivery failures are logged but never block the API response
- Do NOT build admin panel pages or admin API endpoints

---

## 6. Completion Protocol
[Standard report]

## 7. Execution & Orchestration
**Recommended:** `claude --max-turns 50`
Read spec Sections 5.2, 4.5.4. Survey Phase 02a/02b output. Build templates → integration → triggers → UI. Update `PHASE-03-PROGRESS.md`.
