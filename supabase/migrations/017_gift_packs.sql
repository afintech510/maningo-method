-- Real gift card system: code-based, redeemable, with optional auto-email to recipient.

CREATE TABLE IF NOT EXISTS public.gift_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  purchaser_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recipient_name text,
  recipient_email text,
  sender_message text CHECK (sender_message IS NULL OR length(sender_message) <= 280),
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('email','share')),
  pack_type text NOT NULL CHECK (pack_type IN ('single','5pack','10pack','custom')),
  credits int NOT NULL CHECK (credits >= 0),
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  stripe_payment_intent_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','redeemed','cancelled')),
  redeemed_by uuid REFERENCES public.profiles(id),
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_packs_purchaser ON public.gift_packs(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_gift_packs_status ON public.gift_packs(status);
CREATE INDEX IF NOT EXISTS idx_gift_packs_code_upper ON public.gift_packs(upper(code));

ALTER TABLE public.gift_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gift_packs_purchaser_read ON public.gift_packs;
CREATE POLICY gift_packs_purchaser_read ON public.gift_packs
  FOR SELECT USING (auth.uid() = purchaser_id);

DROP POLICY IF EXISTS gift_packs_redeemer_read ON public.gift_packs;
CREATE POLICY gift_packs_redeemer_read ON public.gift_packs
  FOR SELECT USING (auth.uid() = redeemed_by);

DROP POLICY IF EXISTS gift_packs_admin_all ON public.gift_packs;
CREATE POLICY gift_packs_admin_all ON public.gift_packs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
