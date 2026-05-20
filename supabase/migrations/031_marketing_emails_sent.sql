-- Dedup ledger for automated marketing emails. UNIQUE (member_id, email_type)
-- is the dedup key — we INSERT before sending, so a duplicate insert fails
-- the unique constraint and we abort without re-sending.

CREATE TABLE IF NOT EXISTS public.marketing_emails_sent (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type  text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb,
  UNIQUE (member_id, email_type)
);

CREATE INDEX IF NOT EXISTS idx_marketing_emails_sent_type ON public.marketing_emails_sent(email_type);

ALTER TABLE public.marketing_emails_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_emails_sent_admin" ON public.marketing_emails_sent
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
