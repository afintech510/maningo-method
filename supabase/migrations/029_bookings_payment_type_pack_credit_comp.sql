-- The admin add-member flow uses two new payment_type values that the
-- original 003 constraint refused (it only allowed 'drop_in' and
-- 'subscription'). Without this, every admin add-member insert was
-- silently failing the CHECK and returning INTERNAL_ERROR.

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_type_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_type_check
  CHECK (payment_type IN ('drop_in', 'subscription', 'pack_credit', 'comp'));
