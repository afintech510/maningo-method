-- Let cash/Venmo (manual) payments carry a discount code, mirroring the card
-- checkout path. amount_cents stores the discounted amount owed; the columns
-- below record which code was applied and how much it knocked off.

ALTER TABLE public.manual_payments
  ADD COLUMN IF NOT EXISTS discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount_cents int NOT NULL DEFAULT 0;
