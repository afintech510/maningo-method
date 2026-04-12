# Phase 05: Testing
**Project:** Maningo Method
**Spec:** maningo-method-spec-v2.md
**Build Plan:** maningo-method-buildplan.md
**Prerequisites:** Phase 04 complete
**Implements:** Quality assurance
**Recommended:** `claude --max-turns 75`

---

## 1. Context

You are executing **Phase 05: Testing** of the Maningo Method build. All features are built. Your job is to add comprehensive tests. **Mobile viewport (375px) is the primary E2E test target.**

**Spec File:** `maningo-method-spec-v2.md` — Section 9 (Testing Strategy).

### What Already Exists
All application code from Phases 00-04. The `tests/` directory structure exists with empty directories for unit/, integration/, e2e/, fixtures/.

---

## 2. Deliverables

1. **Vitest config** — `vitest.config.ts`, test setup with Supabase local
2. **Unit tests** — Zod schemas (auth, booking, class), timezone helpers, utility functions, email template rendering, capacity logic edge cases
3. **Integration tests** — All API endpoints, webhook handler (all 6 events + idempotency + error responses), pending cleanup, admin endpoints with auth
4. **E2E tests (Playwright)** — 5 journeys at 375px primary viewport
5. **Test fixtures** — Factory functions for classes, students, bookings, subscriptions
6. **Test seed script** — `tests/setup.ts`

---

## 3. Implementation Instructions

### Task 1: Test Infrastructure
**Creates:** `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts`, `tests/fixtures/`

Vitest: configure for TypeScript, path aliases matching tsconfig. Set up Supabase test client using service_role key pointing at local or test Supabase instance.

Playwright: Chromium primary, WebKit secondary. **Default viewport: 375×812 (iPhone SE).** Screenshot on failure. Base URL from env.

Test setup: helper to create/cleanup test data using service_role Supabase client.

Fixtures: factory functions — `createTestClass()`, `createTestStudent()`, `createTestBooking()`, `createTestSubscription()`. Each returns created record + cleanup function.

### Task 2: Unit Tests
**Creates:** `tests/unit/validations/*.test.ts`, `tests/unit/lib/*.test.ts`

**Zod schemas:** For each schema, test: valid input passes, each invalid field rejected with correct error. Test edge cases: empty strings, boundary values (title 0 chars, 101 chars), invalid date formats, negative capacity.

**Timezone:** `formatStudioTime()` returns Eastern time. Test DST boundary (March/November). Test with UTC input.

**Email templates:** Each of the 4 templates renders to HTML without errors given valid props. Verify studio address appears in BookingConfirmation.

**Capacity logic:** If relevant pure functions exist, test: capacity at 0, at max, concurrent booking limit at 5.

### Task 3: Integration Tests
**Creates:** `tests/integration/api/*.test.ts`, `tests/integration/webhooks/stripe.test.ts`

Test each API endpoint end-to-end against a test database:

**Classes:** GET returns scheduled classes with spots_remaining. Spots count includes pending.

**Bookings:** POST as subscriber → confirmed. POST as drop-in → pending. POST when full → 400 CLASS_FULL. POST duplicate → 400 ALREADY_BOOKED. POST 6th booking as subscriber → 400 MAX_BOOKINGS_REACHED. PATCH cancel → status cancelled, spot freed. GET upcoming uses end-time logic.

**Subscriptions:** GET /me returns null when none, returns status when exists.

**Webhook:** Mock Stripe event payloads. Test all 6 event types:
- checkout.session.completed (payment) → booking pending → confirmed
- checkout.session.completed (subscription) → subscription created
- customer.subscription.updated → status updated
- customer.subscription.deleted → cancelled + future bookings cancelled
- invoice.payment_failed → past_due + future bookings cancelled
- invoice.paid → back to active
- Duplicate event.id → returns 200, no double processing
- DB failure (mock) → returns 500, event NOT in processed table

**Pending cleanup:** Create pending booking older than 15 min → call cleanup → verify status = expired.

**Admin:** Require admin role (student → 403). Create class, edit class, cancel class (verify bookings cancelled), delete class (verify 409 with bookings), enrollment view, student list.

### Task 4: E2E Tests (Playwright)
**Creates:** `tests/e2e/*.spec.ts`

**All tests run at 375px viewport (mobile primary).**

| Test File | Journey | Key Assertions |
|-----------|---------|----------------|
| `schedule-browse.spec.ts` | Load /schedule → see classes → day picker → tap different day | Classes render, spots visible, day filter works, no horizontal scroll |
| `booking-flow-mobile.spec.ts` | Login → navigate to class → book as subscriber → see "Booked ✓" → go to dashboard → cancel | Booking created, appears in dashboard, cancel works, spot freed |
| `subscription-flow.spec.ts` | Register → subscribe → Stripe test checkout → return → verify active → book class | Sub active in dashboard, can book without payment prompt |
| `admin-class-management.spec.ts` | Login as admin → create class → view enrollment → cancel class | Class appears on schedule, roster correct, cancel works (verify bookings cancelled) |
| `dropin-payment-flow.spec.ts` | Login → book as drop-in → pending state → simulate webhook → confirmed | Pending booking created, Stripe redirect URL returned, confirmation after webhook |

For Stripe E2E: use test card `4242424242424242`. For webhook simulation in E2E, either use Stripe CLI forwarding or mock the webhook endpoint.

### Task 5: Test Scripts
**Modifies:** `package.json`

Add scripts:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"test:e2e:mobile": "playwright test --project=mobile"
```

---

## 4. Acceptance Criteria

- [ ] All unit tests pass: `npm test` exits 0
- [ ] All integration tests pass (webhook idempotency + error responses tested)
- [ ] All 5 E2E journeys pass on Chromium at 375px
- [ ] No test relies on shared mutable state (each test creates + cleans own data)
- [ ] Webhook integration tests verify: duplicate → 200, DB fail → 500, bad sig → 400
- [ ] E2E screenshot on failure enabled

---

## 5. Constraints
- Primary Playwright viewport: **375×812** (mobile)
- Tests must be isolated — no shared state between tests
- Use Stripe test mode only
- Do NOT modify application code unless fixing a bug discovered during testing (document any fixes)

## 6. Completion Protocol
[Standard report — include test count summary and any bugs found + fixed]

## 7. Execution & Orchestration
**Recommended:** `claude --max-turns 75`. Read spec Section 9. Build: infrastructure → fixtures → unit → integration → E2E. Update `PHASE-05-PROGRESS.md`.
