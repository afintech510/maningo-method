-- Migration 040: reusable `is_free` flag on classes
--
-- A free class (e.g. the 9/11 memorial class on the gazebo lawn) lets any
-- logged-in member book WITHOUT spending a class credit. The booking write
-- path uses the existing 'comp' payment_type (allowed since migration 029),
-- so no booking-type change is needed here.
--
-- This migration:
--   1. Adds classes.is_free (default false — existing classes stay credit-gated).
--   2. Updates join_waitlist so a free class's waitlist can be joined without a
--      credit balance, while keeping the same atomic capacity/duplicate checks.
--
-- Applied MANUALLY against Supabase (there is no automated migration runner).

-- ═══ 1. COLUMN ═══

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

-- ═══ 2. join_waitlist — skip the credit gate for free classes ═══
-- Identical to the definition in migration 035 except it loads classes.is_free
-- and only enforces the >= 1 credit requirement for non-free classes.

CREATE OR REPLACE FUNCTION public.join_waitlist(p_class_id uuid)
RETURNS uuid AS $$
DECLARE
  v_student_id     uuid;
  v_class_status   text;
  v_max_capacity   integer;
  v_is_free        boolean;
  v_booked_count   integer;
  v_credits        integer;
  v_waitlist_id    uuid;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  -- Lock the class row
  SELECT status, max_capacity, is_free
    INTO v_class_status, v_max_capacity, v_is_free
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

  -- Free classes don't require credits; paid classes need at least 1.
  IF NOT v_is_free THEN
    SELECT credits INTO v_credits
    FROM public.profiles
    WHERE id = v_student_id;

    IF COALESCE(v_credits, 0) < 1 THEN
      RAISE EXCEPTION 'NO_CREDITS';
    END IF;
  END IF;

  INSERT INTO public.waitlists (student_id, class_id, status)
  VALUES (v_student_id, p_class_id, 'waiting')
  RETURNING id INTO v_waitlist_id;

  RETURN v_waitlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
