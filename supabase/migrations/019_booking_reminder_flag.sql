-- Track when a 24h class reminder was sent for a booking so the cron
-- can be safely run on a tight interval without double-sending.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_pending
  ON public.bookings(reminder_sent_at)
  WHERE reminder_sent_at IS NULL;
