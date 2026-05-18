-- Track which bookings were created by an admin on behalf of a member
-- (vs the member self-booking). Lets the cancel path skip a credit refund
-- for comp seats and for admin-added pack_credit seats. NULL = student
-- self-booked (the default and historical behavior).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS added_by_admin uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_bookings_added_by_admin
  ON public.bookings(added_by_admin) WHERE added_by_admin IS NOT NULL;
