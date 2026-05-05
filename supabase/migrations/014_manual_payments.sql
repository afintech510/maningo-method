-- Off-platform payment requests (Cash, Zelle, Venmo direct).
-- Credits are NOT applied until admin marks the record paid.

CREATE TABLE IF NOT EXISTS public.manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_type text NOT NULL,
  credits int NOT NULL CHECK (credits > 0),
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash','zelle','venmo')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  paid_by uuid REFERENCES public.profiles(id),
  cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_manual_payments_student ON public.manual_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON public.manual_payments(status);

ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manual_payments_owner_read ON public.manual_payments;
CREATE POLICY manual_payments_owner_read ON public.manual_payments
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS manual_payments_admin_all ON public.manual_payments;
CREATE POLICY manual_payments_admin_all ON public.manual_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
