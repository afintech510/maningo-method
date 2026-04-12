-- Migration 003: bookings table + create_booking RPC + cleanup function
-- Implements: F-003, F-006, F-012
-- Review fixes: REV-001, REV-002, REV-010, REV-011, REV-017, REV-019, REV-023

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  payment_type text NOT NULL CHECK (payment_type IN ('drop_in', 'subscription')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_paid_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);

-- Indexes
CREATE INDEX idx_bookings_class_id_status ON public.bookings (class_id, status);
CREATE INDEX idx_bookings_student_id_status ON public.bookings (student_id, status);
CREATE UNIQUE INDEX uniq_bookings_student_class ON public.bookings (student_id, class_id)
  WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_bookings_pending_cleanup ON public.bookings (status, created_at)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Atomic booking with capacity check
CREATE OR REPLACE FUNCTION public.create_booking(
  p_class_id uuid,
  p_payment_type text,
  p_stripe_checkout_session_id text DEFAULT NULL,
  p_stripe_payment_intent_id text DEFAULT NULL,
  p_amount_paid_cents integer DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
  p_status text DEFAULT 'confirmed'
)
RETURNS uuid AS $$
DECLARE
  v_booking_id uuid;
  v_current_count integer;
  v_max_capacity integer;
  v_class_status text;
  v_effective_student_id uuid;
  v_active_booking_count integer;
  v_max_concurrent_bookings integer := 5;
BEGIN
  v_effective_student_id := COALESCE(p_student_id, auth.uid());

  IF v_effective_student_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  -- Lock the class row to prevent race conditions
  SELECT max_capacity, status INTO v_max_capacity, v_class_status
  FROM public.classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF v_class_status IS NULL THEN
    RAISE EXCEPTION 'CLASS_NOT_FOUND';
  END IF;

  IF v_class_status = 'cancelled' THEN
    RAISE EXCEPTION 'CLASS_CANCELLED';
  END IF;

  -- Count pending + confirmed bookings for capacity
  SELECT COUNT(*) INTO v_current_count
  FROM public.bookings
  WHERE class_id = p_class_id AND status IN ('pending', 'confirmed');

  IF v_current_count >= v_max_capacity THEN
    RAISE EXCEPTION 'CLASS_FULL';
  END IF;

  -- Check for existing booking by this student
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE class_id = p_class_id
      AND student_id = v_effective_student_id
      AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED';
  END IF;

  -- Check max concurrent active bookings for subscribers
  IF p_payment_type = 'subscription' THEN
    SELECT COUNT(*) INTO v_active_booking_count
    FROM public.bookings b
    JOIN public.classes c ON b.class_id = c.id
    WHERE b.student_id = v_effective_student_id
      AND b.status IN ('pending', 'confirmed')
      AND c.starts_at > now();

    IF v_active_booking_count >= v_max_concurrent_bookings THEN
      RAISE EXCEPTION 'MAX_BOOKINGS_REACHED';
    END IF;
  END IF;

  -- Create the booking
  INSERT INTO public.bookings (
    student_id, class_id, status, payment_type,
    stripe_checkout_session_id, stripe_payment_intent_id, amount_paid_cents
  )
  VALUES (
    v_effective_student_id, p_class_id, p_status, p_payment_type,
    p_stripe_checkout_session_id, p_stripe_payment_intent_id, p_amount_paid_cents
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup pending bookings older than 15 minutes
CREATE OR REPLACE FUNCTION public.cleanup_pending_bookings()
RETURNS integer AS $$
DECLARE
  v_expired_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.bookings
    SET status = 'expired'
    WHERE status = 'pending'
      AND created_at < now() - interval '15 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_count FROM expired;

  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
