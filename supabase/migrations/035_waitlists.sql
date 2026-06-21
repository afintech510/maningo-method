-- Migration 035: Waitlist table + RPCs for join / promote
--
-- A member can join the waitlist for a full class (one active entry per
-- class). An admin manually promotes someone, creating a confirmed
-- booking and deducting a credit. Promotion bypasses the capacity check
-- (admin override) but surfaces the resulting fill count.

-- ═══ TABLE ═══

CREATE TABLE public.waitlists (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id    uuid        NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'waiting'
                          CHECK (status IN ('waiting', 'promoted', 'cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  promoted_at timestamptz
);

-- One active waitlist entry per member per class
CREATE UNIQUE INDEX uniq_waitlist_student_class_waiting
  ON public.waitlists (student_id, class_id) WHERE status = 'waiting';

-- FIFO queue ordering + admin queries
CREATE INDEX idx_waitlist_class_queue
  ON public.waitlists (class_id, status, created_at);

ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;

-- ═══ RLS POLICIES ═══

-- Members read their own waitlist entries
CREATE POLICY "waitlists_select_own" ON public.waitlists
  FOR SELECT USING (auth.uid() = student_id);

-- Admins read all
CREATE POLICY "waitlists_select_admin" ON public.waitlists
  FOR SELECT USING (public.is_admin());

-- Members can insert their own (join_waitlist RPC is the preferred path,
-- but the policy allows it for flexibility)
CREATE POLICY "waitlists_insert_own" ON public.waitlists
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Members can update (cancel) their own
CREATE POLICY "waitlists_update_own" ON public.waitlists
  FOR UPDATE USING (auth.uid() = student_id);

-- Admins can update all (promote / cancel)
CREATE POLICY "waitlists_update_admin" ON public.waitlists
  FOR UPDATE USING (public.is_admin());

-- Admins can delete
CREATE POLICY "waitlists_delete_admin" ON public.waitlists
  FOR DELETE USING (public.is_admin());

-- ═══ join_waitlist RPC ═══

CREATE OR REPLACE FUNCTION public.join_waitlist(p_class_id uuid)
RETURNS uuid AS $$
DECLARE
  v_student_id     uuid;
  v_class_status   text;
  v_max_capacity   integer;
  v_booked_count   integer;
  v_credits        integer;
  v_waitlist_id    uuid;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  -- Lock the class row
  SELECT status, max_capacity INTO v_class_status, v_max_capacity
  FROM public.classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF v_class_status IS NULL THEN
    RAISE EXCEPTION 'CLASS_NOT_FOUND';
  END IF;
  IF v_class_status = 'cancelled' THEN
    RAISE EXCEPTION 'CLASS_CANCELLED';
  END IF;

  -- Class must actually be full
  SELECT COUNT(*) INTO v_booked_count
  FROM public.bookings
  WHERE class_id = p_class_id AND status IN ('pending', 'confirmed');

  IF v_booked_count < v_max_capacity THEN
    RAISE EXCEPTION 'NOT_FULL';
  END IF;

  -- Not already booked
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE class_id = p_class_id
      AND student_id = v_student_id
      AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED';
  END IF;

  -- Not already waiting
  IF EXISTS (
    SELECT 1 FROM public.waitlists
    WHERE class_id = p_class_id
      AND student_id = v_student_id
      AND status = 'waiting'
  ) THEN
    RAISE EXCEPTION 'ALREADY_WAITING';
  END IF;

  -- Must have at least 1 credit
  SELECT credits INTO v_credits
  FROM public.profiles
  WHERE id = v_student_id;

  IF COALESCE(v_credits, 0) < 1 THEN
    RAISE EXCEPTION 'NO_CREDITS';
  END IF;

  INSERT INTO public.waitlists (student_id, class_id, status)
  VALUES (v_student_id, p_class_id, 'waiting')
  RETURNING id INTO v_waitlist_id;

  RETURN v_waitlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ promote_from_waitlist RPC ═══
-- Admin-only. Creates a confirmed booking for the waitlisted member,
-- marks the waitlist entry as promoted. Does NOT deduct credits here —
-- the API route calls applyCreditDelta so the credit_adjustments ledger
-- is written consistently via the TS helper.

CREATE OR REPLACE FUNCTION public.promote_from_waitlist(p_waitlist_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_row           public.waitlists%ROWTYPE;
  v_credits       integer;
  v_booking_id    uuid;
  v_booked_count  integer;
  v_max_capacity  integer;
BEGIN
  -- Admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT * INTO v_row
  FROM public.waitlists
  WHERE id = p_waitlist_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'WAITLIST_NOT_FOUND';
  END IF;
  IF v_row.status <> 'waiting' THEN
    RAISE EXCEPTION 'NOT_WAITING';
  END IF;

  -- Re-check credits
  SELECT credits INTO v_credits
  FROM public.profiles
  WHERE id = v_row.student_id;

  IF COALESCE(v_credits, 0) < 1 THEN
    RAISE EXCEPTION 'NO_CREDITS';
  END IF;

  -- Already booked? (edge case)
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE class_id = v_row.class_id
      AND student_id = v_row.student_id
      AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED';
  END IF;

  -- Create confirmed booking (admin override — bypasses capacity)
  INSERT INTO public.bookings (
    class_id, student_id, status, payment_type, added_by_admin
  ) VALUES (
    v_row.class_id, v_row.student_id, 'confirmed', 'pack_credit', auth.uid()
  )
  RETURNING id INTO v_booking_id;

  -- Mark promoted
  UPDATE public.waitlists
  SET status = 'promoted', promoted_at = now()
  WHERE id = p_waitlist_id;

  -- Return fill info so the admin sees the resulting count
  SELECT max_capacity INTO v_max_capacity
  FROM public.classes WHERE id = v_row.class_id;

  SELECT COUNT(*) INTO v_booked_count
  FROM public.bookings
  WHERE class_id = v_row.class_id AND status IN ('pending', 'confirmed');

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'student_id', v_row.student_id,
    'class_id', v_row.class_id,
    'booked_count', v_booked_count,
    'max_capacity', v_max_capacity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
