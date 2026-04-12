# Phase 02b: Payments (Stripe)
**Project:** Maningo Method
**Spec:** maningo-method-spec-v2.md
**Build Plan:** maningo-method-buildplan.md
**Prerequisites:** Phase 01 complete
**Implements:** F-004 (Drop-in payment), F-005 (Monthly subscription)
**Recommended:** `claude --max-turns 75`

---

## 1. Context

You are executing **Phase 02b: Payments (Stripe)** of the Maningo Method build.

**Your scope:** Stripe Checkout (drop-in + subscription), webhook handler for all 6 events, subscription lifecycle management, payment success page. Do NOT build schedule UI, admin panel, email sending, or notification logic. You WILL modify the POST /api/bookings route from Phase 2a to wire in real Stripe Checkout URLs.

**Tech Stack:** Next.js 14, Supabase, Stripe (stripe-node), Zod
**Spec File:** `maningo-method-spec-v2.md` — Sections 3.2 (Subscription endpoints, Webhook), 3.3 (Webhook implementation pattern), 5.1 (Stripe integration), 2.2 (subscriptions table, processed_stripe_events, create_booking RPC).

### What Already Exists
- Phase 00: Stripe lazy-init utility (`src/lib/stripe.ts`), Supabase admin client
- Phase 01: All database tables including subscriptions, processed_stripe_events, bookings (with pending status), RLS policies, auth middleware
- Phase 02a (if complete): POST /api/bookings creates pending booking for drop-in (with placeholder checkout URL), GET /api/bookings, booking cancellation

### What You're Building
The complete Stripe payment flow: drop-in checkout, subscription checkout, 6-event webhook handler with idempotency and correct error responses, subscription management endpoints, and the post-checkout success page.

---

## 2. Objective & Deliverables

### Objective
After this phase, students can pay $35 for a drop-in class or subscribe at $95/month via Stripe Checkout. Webhook events correctly update bookings and subscriptions. Subscription loss cancels future bookings.

### Deliverables
1. `POST /api/subscriptions/checkout` — Create Stripe Checkout (subscription mode), customer on profiles — Spec Section 3.2
2. `GET /api/subscriptions/me` — Subscription status — Spec Section 3.2
3. `POST /api/subscriptions/portal` — Stripe Customer Portal — Spec Section 3.2
4. `POST /api/webhooks/stripe` — 6 event handlers, idempotency, correct error responses — Spec Section 3.2, 3.3
5. **Update** `POST /api/bookings` drop-in path — Wire in real Stripe Checkout Session with metadata — Spec Section 3.2
6. `/booking-success` page — Handles both drop-in and subscription return — Spec Section 4.4
7. `/subscription` page — Subscribe CTA or Portal link based on status — Spec Section 4.4
8. `src/validations/subscription.ts` — Zod schemas

---

## 3. Implementation Instructions

### Task 1: Stripe Customer Management
**Spec Reference:** Section 3.2 (POST /api/subscriptions/checkout), Section 2.2 (profiles.stripe_customer_id)
**Creates:** Helper function in `src/lib/stripe.ts`

Create `getOrCreateStripeCustomer(studentId: string, email: string): Promise<string>`:
1. Query `profiles` for `stripe_customer_id` where id = studentId.
2. If exists and not null → return it.
3. If null → create Stripe Customer with email and metadata.student_id → update profiles.stripe_customer_id → return new ID.

This centralizes Stripe Customer management on the profiles table (REV-007 fix). Used by both subscription and drop-in flows.

### Task 2: Subscription Endpoints
**Spec Reference:** Section 3.2 (Subscriptions)
**Creates:** `src/app/api/subscriptions/checkout/route.ts`, `me/route.ts`, `portal/route.ts`

**POST /api/subscriptions/checkout:**
1. Require auth.
2. Check existing active subscription → 409 ALREADY_SUBSCRIBED.
3. Call `getOrCreateStripeCustomer()`.
4. Create Stripe Checkout Session:
   - mode: 'subscription'
   - customer: stripe_customer_id
   - line_items: $95/month price ID (from env var `STRIPE_SUBSCRIPTION_PRICE_ID`)
   - success_url: per spec Section 5.1
   - cancel_url: per spec Section 5.1
   - metadata: { student_id }
5. Return { checkout_url }.

**GET /api/subscriptions/me:** Query subscriptions by student_id. Return status + current_period_end, or null.

**POST /api/subscriptions/portal:** Require active subscription. Get stripe_customer_id from profiles. Create Stripe Billing Portal session. Return { portal_url }.

### Task 3: Update Drop-In Booking Path
**Modifies:** `src/app/api/bookings/route.ts` (POST handler, drop-in branch)

Replace placeholder checkout URL with real Stripe Checkout:
1. After creating pending booking (already done in 2a), call `getOrCreateStripeCustomer()`.
2. Create Stripe Checkout Session:
   - mode: 'payment'
   - customer: stripe_customer_id
   - line_items: $35 price ID (from env var `STRIPE_DROPIN_PRICE_ID`)
   - success_url: `${BASE_URL}/booking-success?type=drop_in&session_id={CHECKOUT_SESSION_ID}`
   - cancel_url: `${BASE_URL}/schedule?payment_cancelled=true`
   - metadata: { student_id, class_id, booking_id }  ← booking_id from the pending booking
3. Store `stripe_checkout_session_id` on the pending booking record.
4. Return { booking_id, checkout_url }.
5. If Stripe Checkout creation fails → delete the pending booking → return 502 STRIPE_ERROR.

### Task 4: Webhook Handler
**Spec Reference:** Section 3.2 (Stripe Webhooks), Section 3.3 (Implementation pattern)
**Creates:** `src/app/api/webhooks/stripe/route.ts`

**CRITICAL — This is the highest-risk component in the entire build.**

**Setup:**
- Disable body parsing for this route: `export const config = { api: { bodyParser: false } }` (or Next.js App Router equivalent: read raw body via `request.text()`).
- Verify signature: `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`.
- On bad signature → return 400.
- Use Supabase admin client (service_role) for all DB operations.

**Idempotency (REV-005):**
```
1. Check processed_stripe_events for event.id
2. If exists → log "duplicate event" → return 200
3. Process event
4. INSERT INTO processed_stripe_events
5. Return 200
```

**Error handling (REV-006):**
```
- Signature fail → 400
- Idempotent duplicate → 200
- Processing success → INSERT event → 200
- DB error during processing → DO NOT insert event → return 500
  (Stripe retries. Safe because event not marked processed.)
```

**Event handlers:**

**`checkout.session.completed` (mode: 'payment'):**
1. Extract metadata: student_id, class_id, booking_id.
2. Get payment_intent from session.
3. Update the pending booking → confirmed. Set stripe_payment_intent_id, amount_paid_cents.
4. If booking not found (expired?), log warning. Do NOT create a new one.

**`checkout.session.completed` (mode: 'subscription'):**
1. Extract metadata: student_id.
2. Extract subscription ID from session.
3. Retrieve full subscription object from Stripe API.
4. UPSERT into subscriptions table: student_id, stripe_subscription_id, status='active', period dates.
5. Ensure stripe_customer_id is on profiles (should already be, but verify).

**`customer.subscription.updated`:**
1. Lookup subscription by stripe_subscription_id.
2. Update status, current_period_start, current_period_end.
3. If new status = 'active' (recovered from past_due), no extra action needed.

**`customer.subscription.deleted` (REV-008):**
1. Lookup subscription by stripe_subscription_id → set status = 'cancelled'.
2. Get student_id from subscription.
3. Cancel all future confirmed subscription bookings:
```sql
UPDATE bookings SET status = 'cancelled', cancelled_at = now()
WHERE student_id = $1 AND payment_type = 'subscription'
  AND status = 'confirmed'
  AND class_id IN (SELECT id FROM classes WHERE starts_at > now())
```
4. Log the count of cancelled bookings. (Email notification in Phase 3.)

**`invoice.payment_failed`:**
1. Extract subscription ID from invoice.
2. Update subscription status = 'past_due'.
3. Cancel future subscription bookings (same query as above).

**`invoice.paid` (REV-009):**
1. Extract subscription ID from invoice.
2. Update subscription: status = 'active', current_period_end from invoice period.

### Task 5: Booking Success Page
**Creates:** `src/app/booking-success/page.tsx`

URL params: `?type=drop_in|subscription&session_id=xxx`

For drop-in: display "You're booked! 🎉" with class title, date, time (fetched from the booking). If session status is still pending (webhook hasn't fired yet), show "Confirming your payment..." with a polling check (every 2s, max 10 attempts, then "Your booking will be confirmed shortly").

For subscription: display "Welcome to Maningo Method! Your unlimited membership is active." with CTA to browse schedule.

For `?payment_cancelled=true` on `/schedule` or `/subscription`: show a toast "Payment was cancelled."

Mobile-optimized: centered content, large checkmark icon, clear CTAs.

### Task 6: Subscription Page
**Creates:** Update `src/app/(student)/subscription/page.tsx`

Replace placeholder. Three states:
1. **No subscription:** "Unlimited classes for $95/month" + "Subscribe Now" button → POST /api/subscriptions/checkout → redirect to Stripe.
2. **Active:** Green badge "Active", shows renewal date, "Manage Subscription" button → POST /api/subscriptions/portal → redirect to Stripe Portal.
3. **Past due:** Amber warning "Payment failed — update your card to keep booking", "Update Payment" button → Portal.

---

## 4. Acceptance Criteria

- [ ] Drop-in: POST /api/bookings → pending booking created → Stripe Checkout URL returned → metadata includes booking_id
- [ ] Drop-in: Stripe test payment → webhook fires → booking updated to confirmed with payment_intent_id + amount_paid_cents
- [ ] Drop-in: If Stripe Checkout creation fails → pending booking deleted → 502 returned
- [ ] Subscription: POST /api/subscriptions/checkout → Stripe Checkout → webhook → subscription record created, customer_id on profiles
- [ ] Subscription: Cancel via Portal → webhook → subscription cancelled, future bookings cancelled
- [ ] invoice.payment_failed → subscription past_due, future bookings cancelled
- [ ] invoice.paid → subscription back to active
- [ ] Webhook: duplicate event.id → returns 200, no duplicate processing
- [ ] Webhook: DB failure → returns 500 (event NOT marked as processed)
- [ ] Webhook: bad signature → returns 400
- [ ] Webhook: body parsing disabled (raw body used for signature verification)
- [ ] Booking success page: shows correct content for drop-in and subscription
- [ ] Booking success page: polls for confirmation if webhook hasn't fired yet
- [ ] Subscription page: correct state for none/active/past_due
- [ ] Stripe test mode payments work end-to-end
- [ ] Mobile return URLs work in Safari (no popups)

---

## 5. Constraints

### Hard Constraints
- Webhook MUST return 500 on DB failure (REV-006). NEVER return 200 if processing failed.
- Webhook MUST check idempotency BEFORE processing (REV-005).
- Body parsing MUST be disabled on webhook route.
- Subscription loss MUST cancel future bookings (REV-008).
- stripe_customer_id stored on profiles, NOT subscriptions (REV-007).
- Metadata MUST include booking_id for drop-in (REV-002).
- Use lazy-init Stripe pattern from Phase 00.
- Do NOT build email sending, admin panel, or schedule UI changes.

### Soft Constraints
- Log all webhook events with pino (event type, event ID, processing result).
- Follow error format from spec Section 8.1.

---

## 6. Completion Protocol
[Standard: Files Created/Modified, Criteria Results, Ambiguities, Blocked, Decisions, Warnings]

---

## 7. Execution & Orchestration

**Recommended:** `claude --max-turns 75`

### Task Planning
1. Read spec Sections 3.2 (Subscriptions, Webhooks), 3.3, 5.1, 2.2 (subscriptions, processed_events)
2. Survey Phase 01 schema + Phase 02a booking route
3. Build: Stripe customer helper → subscription endpoints → update drop-in path → webhook handler → UI pages
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`

### Resumption Protocol
If resuming: read prompt → check which endpoints exist → test webhook handler → read `PHASE-02B-PROGRESS.md`.

### Progress Tracking
Update `PHASE-02B-PROGRESS.md` after each task.
