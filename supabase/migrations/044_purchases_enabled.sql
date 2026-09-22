-- Migration 044: studio-wide purchasing kill switch
--
-- Adds studio_settings.purchases_enabled. When false, every path that sells
-- new class credits is closed: card packs, cash packs, the October promo, and
-- gift-pack purchases (a gift card is prepaid credits, so it sells the same
-- thing). Redeeming an already-purchased gift code, booking with credits a
-- member already holds, joining a waitlist, and admin credit adjustments all
-- keep working — this only stops NEW money coming in.
--
-- Default true so applying this migration changes nothing on its own; flip it
-- from Admin → Sales → Studio settings (no redeploy needed).
--
-- Applied MANUALLY against Supabase (there is no automated migration runner).

ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS purchases_enabled boolean NOT NULL DEFAULT true;
