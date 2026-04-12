# Phase 04: Admin Panel
**Project:** Maningo Method
**Spec:** maningo-method-spec-v2.md
**Build Plan:** maningo-method-buildplan.md
**Prerequisites:** Phase 03 complete
**Implements:** F-009 (Admin class management), F-010 (Admin enrollment view), F-011 (Admin student list)
**Recommended:** `claude --max-turns 50`

---

## 1. Context

You are executing **Phase 04: Admin Panel** of the Maningo Method build.

**Your scope:** All admin API endpoints, admin UI pages (mobile-first card layouts), admin middleware, class CRUD with cancel flow (batch email + refund report), enrollment roster, student list.

**Spec File:** `maningo-method-spec-v2.md` — Sections 3.2 (Admin Endpoints), 4.5.4 (Admin Mobile).

## Skills Reference
`view /mnt/skills/public/frontend-design/SKILL.md` before building admin UI.

### What Already Exists
- Phase 01: Admin layout, admin middleware pattern, all UI primitives, feedback components
- Phase 02a/02b: Booking and subscription data in DB
- Phase 03: Email templates (ClassCancellation, all Resend helpers), refund report function

### What You're Building
The complete admin experience — the instructor manages everything from their phone.

---

## 2. Objective & Deliverables

1. `POST /api/admin/classes` — Create class with Zod validation — Spec Section 3.2
2. `PATCH /api/admin/classes/[id]` — Update/cancel class. Cancel: batch email + refund report — Spec Section 3.2
3. `DELETE /api/admin/classes/[id]` — Delete only if no active bookings — Spec Section 3.2
4. `GET /api/admin/classes` — All classes with booked_count — Spec Section 3.2
5. `GET /api/admin/classes/[id]/enrollments` — Class roster — Spec Section 3.2
6. `GET /api/admin/students` — All students with sub status — Spec Section 3.2
7. Admin pages: classes list, create class, edit class + roster, students list — mobile card layout
8. `src/validations/class.ts` — Zod schemas for class CRUD
9. Admin middleware applied to all admin routes

---

## 3. Implementation Instructions

### Task 1: Admin Middleware
**Creates:** `src/lib/middleware/requireAdmin.ts` (or similar)

Wraps the auth middleware from Phase 01. Checks that the authenticated user's profile has `role = 'admin'`. Returns 403 with FORBIDDEN error if not. Apply to ALL admin API routes.

### Task 2: Admin API Routes
**Creates:** All routes under `src/app/api/admin/`

**POST /api/admin/classes:** Validate with Zod (title 1-100, starts_at in future, duration 15-180, max_capacity 1-30, description 0-500). Insert into classes table with created_by = admin user ID. Return created class.

**GET /api/admin/classes:** Return all classes (all statuses, including past). Include `booked_count` (COUNT of confirmed + pending bookings). Support optional status and date range filters.

**PATCH /api/admin/classes/[id]:** Partial update. Special case: if `status` set to `cancelled`:
1. Update class status = 'cancelled'
2. Update all confirmed + pending bookings to cancelled
3. Send batch cancellation email via `sendClassCancellationBatch()` from Phase 03
4. Call `generateRefundReport()` from Phase 03 for drop-in bookings
5. Return updated class + count of cancelled bookings

**DELETE /api/admin/classes/[id]:** Check for confirmed or pending bookings. If any exist → 409 HAS_ACTIVE_BOOKINGS. Otherwise delete.

**GET /api/admin/classes/[id]/enrollments:** Return class details + list of enrolled students (JOIN bookings + profiles). Include booking_id, student name, email, phone, payment_type, status, booked_at.

**GET /api/admin/students:** Return all profiles with role='student'. LEFT JOIN subscriptions for status. Include total_bookings count, last_booking_at.

### Task 3: Validation Schemas
**Creates:** `src/validations/class.ts`

- `createClassSchema`: title, starts_at (ISO future date), duration_minutes, max_capacity, description (optional)
- `updateClassSchema`: partial version of create (all fields optional)

### Task 4: Admin UI Pages
**Creates:** All pages under `src/app/(admin)/admin/`

**Classes list** (`/admin/classes`): On mobile, render as cards (not table). Each card: title, date/time, enrolled/capacity, status badge, Edit/Cancel action buttons. Filter tabs: Upcoming / Past / Cancelled. FAB or top button: "+ New Class".

**Create class** (`/admin/classes/new`): Mobile form (same patterns as auth forms — 48px inputs, full-width button). Date/time picker for starts_at. Number inputs for duration and capacity.

**Edit class + roster** (`/admin/classes/[id]`): Two sections: edit form (top) + enrollment list (bottom). Enrollment list: student cards with name, email, phone (tap to call on mobile), payment type badge, booked_at. Cancel class button (destructive, with confirmation).

**Students list** (`/admin/students`): Search bar at top. Cards on mobile: name, email, subscription badge (Active/Past Due/None), total bookings, last booking date. Sortable by name or last booking.

All pages: loading skeletons, empty states per spec Section 4.2.

### Task 5: Admin Layout Finalization
**Modifies:** `src/app/(admin)/layout.tsx`

Mobile: bottom nav with 3 tabs — Classes (grid icon), Students (users icon), Settings (gear icon → placeholder).
Desktop (lg:): sidebar with same links.

---

## 4. Acceptance Criteria

- [ ] Admin can create class → appears on public schedule with correct data
- [ ] Admin can edit class (title, time, capacity)
- [ ] Admin can cancel class → all bookings cancelled, batch email sent, refund report generated for drop-ins
- [ ] Admin can delete class ONLY if no active bookings → 409 otherwise
- [ ] Enrollment view shows all booked students with contact info and payment type
- [ ] Student list shows all students with subscription status and booking stats
- [ ] Non-admin user gets 403 on all admin endpoints
- [ ] Mobile (375px): cards (not tables), touch-friendly, no horizontal scroll
- [ ] All pages have loading skeletons and empty states
- [ ] Admin bottom nav works on mobile, sidebar on desktop
- [ ] Phone numbers are tappable (tel: links) on mobile enrollment view

---

## 5. Constraints

### Hard Constraints
- Class cancellation MUST use batch email (REV-021) and generate refund report (REV-022)
- Admin role check on EVERY admin endpoint
- Mobile card layout (not tables) for all admin lists
- Do NOT modify student-facing pages or booking logic

---

## 6. Completion Protocol
[Standard report]

## 7. Execution & Orchestration
**Recommended:** `claude --max-turns 50`
Read spec Section 3.2 (admin endpoints). Build: middleware → API routes → validation → UI pages. Update `PHASE-04-PROGRESS.md`.
