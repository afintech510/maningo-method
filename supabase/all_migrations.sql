-- Migration 001: profiles table + auth trigger
-- Implements: F-002 (Student account creation)
-- Review fixes: REV-004, REV-007, REV-011, REV-014

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  stripe_customer_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_email ON public.profiles (email);
CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE UNIQUE INDEX idx_profiles_stripe_customer ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Auto-create profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Migration 002: classes table
-- Implements: F-001, F-006, F-009
-- Review fixes: REV-024 (completed status)

CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  max_capacity integer NOT NULL DEFAULT 16 CHECK (max_capacity > 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_classes_starts_at ON public.classes (starts_at);
CREATE INDEX idx_classes_status_starts_at ON public.classes (status, starts_at);

-- Updated_at trigger
CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
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
-- Migration 004: subscriptions table
-- Implements: F-005
-- Review fixes: REV-007 (stripe_customer_id on profiles, not here)

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) UNIQUE,
  stripe_subscription_id text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_subscriptions_student_id ON public.subscriptions (student_id);
CREATE UNIQUE INDEX idx_subscriptions_stripe_sub_id ON public.subscriptions (stripe_subscription_id);

-- Updated_at trigger
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- Migration 005: processed_stripe_events table
-- Implements: Webhook idempotency (REV-005)

CREATE TABLE public.processed_stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS — only accessed via service_role in webhook handler
-- Migration 006: All RLS policies
-- Review fixes: REV-004 (WITH CHECK prevents role escalation)

-- ═══ PROFILES ═══

-- Students read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin reads all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students update their own profile — CANNOT change role (REV-004)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (role = 'student');

-- Admin can update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══ CLASSES ═══

-- Anyone can read classes (public schedule)
CREATE POLICY "classes_select_public" ON public.classes
  FOR SELECT USING (true);

-- Admin can insert classes
CREATE POLICY "classes_insert_admin" ON public.classes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update classes
CREATE POLICY "classes_update_admin" ON public.classes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete classes
CREATE POLICY "classes_delete_admin" ON public.classes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══ BOOKINGS ═══

-- Students can read their own bookings
CREATE POLICY "bookings_select_own" ON public.bookings
  FOR SELECT USING (auth.uid() = student_id);

-- Admin can read all bookings
CREATE POLICY "bookings_select_admin" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students can update their own bookings (cancel)
CREATE POLICY "bookings_update_own" ON public.bookings
  FOR UPDATE USING (auth.uid() = student_id);

-- Admin can update all bookings
CREATE POLICY "bookings_update_admin" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══ SUBSCRIPTIONS ═══

-- Students can read their own subscription
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = student_id);

-- Admin can read all subscriptions
CREATE POLICY "subscriptions_select_admin" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
