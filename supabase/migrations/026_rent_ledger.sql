-- Host Hampton lease ledger. One snapshot row per locked month, with the
-- hour counts and rates frozen at lock time so subsequent class cancels /
-- adds don't move the bill. Payments roll up per locked month.

CREATE TABLE IF NOT EXISTS public.rent_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  weekday_hours int NOT NULL CHECK (weekday_hours >= 0),
  weekend_hours int NOT NULL CHECK (weekend_hours >= 0),
  weekday_rate_cents int NOT NULL CHECK (weekday_rate_cents >= 0),
  weekend_rate_cents int NOT NULL CHECK (weekend_rate_cents >= 0),
  total_cents int NOT NULL CHECK (total_cents >= 0),
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by uuid REFERENCES public.profiles(id),
  notes text,
  UNIQUE (year, month)
);

CREATE INDEX IF NOT EXISTS idx_rent_months_year_month
  ON public.rent_months(year DESC, month DESC);

CREATE TABLE IF NOT EXISTS public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_month_id uuid NOT NULL REFERENCES public.rent_months(id) ON DELETE CASCADE,
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  paid_on date NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES public.profiles(id),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_rent_payments_month
  ON public.rent_payments(rent_month_id);

ALTER TABLE public.rent_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

-- admin + superadmin can SELECT; only superadmin can mutate (lock / pay).
DROP POLICY IF EXISTS rent_months_read ON public.rent_months;
CREATE POLICY rent_months_read ON public.rent_months
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin'))
  );

DROP POLICY IF EXISTS rent_months_superadmin_write ON public.rent_months;
CREATE POLICY rent_months_superadmin_write ON public.rent_months
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

DROP POLICY IF EXISTS rent_payments_read ON public.rent_payments;
CREATE POLICY rent_payments_read ON public.rent_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin'))
  );

DROP POLICY IF EXISTS rent_payments_superadmin_write ON public.rent_payments;
CREATE POLICY rent_payments_superadmin_write ON public.rent_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );
