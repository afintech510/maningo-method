-- Migration 045: per-pack selling control
--
-- Migration 044 gave the studio one on/off switch for selling credits. That
-- can't express "drop-ins yes, multi-packs no", which is what the studio needs
-- while its class situation is unsettled: a single $25 class is one class of
-- liability, a 10-pack is ten classes that may not happen.
--
-- Adds two knobs on top of the 044 master switch (all three must allow a sale):
--   * sellable_pack_types     — which pack types can be bought at all
--   * gift_purchases_enabled  — gift cards are prepaid credits with no expiry,
--                               so they get their own switch
--
-- Column DEFAULTs are permissive (everything sellable) so a fresh install
-- behaves normally. The UPDATE below then sets THIS studio's live row to the
-- state actually wanted right now:
--
--   selling ON, drop-in only, no gift purchases
--
-- Redeeming gift codes already bought, booking with credits already held,
-- waitlists, and admin credit grants are unaffected by all of this.
--
-- Applied MANUALLY against Supabase (there is no automated migration runner).

-- ═══ 1. COLUMNS ═══

ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS sellable_pack_types text[] NOT NULL
    DEFAULT ARRAY['single', '5pack', '10pack']::text[];

ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS gift_purchases_enabled boolean NOT NULL DEFAULT true;

-- ═══ 2. SET THE LIVE STATE: drop-ins only ═══
-- Re-enables the master switch, but narrows what it lets through. Edit the
-- array (or use Admin → Sales → Studio settings) to put packs back on sale.

UPDATE public.studio_settings
SET
  purchases_enabled      = true,
  sellable_pack_types    = ARRAY['single']::text[],
  gift_purchases_enabled = false
WHERE id = '00000000-0000-0000-0000-000000000001';
