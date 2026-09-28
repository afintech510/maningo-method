-- Migration 046: put the multi-packs back on sale
--
-- Migration 045 narrowed selling to drop-ins only while the studio's class
-- situation was unsettled. From October 1, 2026 classes move to East Moriches,
-- so the 5-pack and 10-pack go back on sale alongside the drop-in.
--
-- Gift cards are left exactly as they are (gift_purchases_enabled is not
-- touched). The October 7-pack flash sale needs nothing here — it has no
-- tickbox and sells on its own fixed Oct 1–4 window (src/lib/promos.ts).
--
-- Same effect as ticking the boxes at Admin → Sales → Studio settings; this
-- file is the record of it. Applied MANUALLY against Supabase.

UPDATE public.studio_settings
SET
  purchases_enabled   = true,
  sellable_pack_types = ARRAY['single', '5pack', '10pack']::text[]
WHERE id = '00000000-0000-0000-0000-000000000001';
