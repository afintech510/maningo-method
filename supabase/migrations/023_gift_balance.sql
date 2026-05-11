-- Dollar-balance gift cards. Custom-amount gifts now transfer their full
-- dollar value onto the recipient's profile as gift_balance_cents. At booking
-- time, when the member runs out of regular credits, the booking API
-- automatically converts $25 of gift balance into 1 credit so the leftover
-- never gets lost. Preset gifts (single / 5pack / 10pack) keep their existing
-- credits semantics.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gift_balance_cents int NOT NULL DEFAULT 0
  CHECK (gift_balance_cents >= 0);

-- An admin should be able to inspect/adjust the balance the same way they
-- already can with credits, so no RLS additions are needed — the existing
-- "admin can read/write all profiles" policy covers it.

COMMENT ON COLUMN public.profiles.gift_balance_cents IS
  'Dollar amount carried from custom-amount gift card redemptions. Drained $25 at a time into the credits column at booking time. See /api/bookings and /api/gift-packs/redeem.';
