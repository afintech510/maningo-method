'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { STRIPE_ENABLED } from '@/lib/feature-flags';
import { OCTOBER_7PACK, promoPhase, type PromoPhase } from '@/lib/promos';

const BUY_HREF = STRIPE_ENABLED
  ? `/checkout/pay?kind=pack&pack=${OCTOBER_7PACK.packType}`
  : `/checkout/manual?pack=${OCTOBER_7PACK.packType}`;

export function OctoberPackPromo({
  variant = 'full',
  purchasesEnabled = true,
}: {
  variant?: 'full' | 'compact';
  purchasesEnabled?: boolean;
}) {
  // Nothing on the server / first paint, then decide on the client — reading
  // the clock during render would be a hydration mismatch. Same pattern as
  // MemorialClassBanner.
  const [phase, setPhase] = useState<PromoPhase | null>(null);

  useEffect(() => {
    setPhase(promoPhase());
  }, []);

  // Advertising a flash sale nobody can buy is worse than hiding it. No
  // teaser either — the studio doesn't want the sale seen before Oct 1.
  if (!purchasesEnabled) return null;
  if (phase !== 'live') return null;

  if (variant === 'compact') {
    return (
      <Card className="border-[#c9a96e]/30 bg-[#c9a96e]/5">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#c9a96e] mb-1.5">
          Flash Sale · Ends Oct 4
        </p>
        <h2 className="text-lg sm:text-xl font-bold leading-snug">
          7 classes for <span className="text-[#c9a96e]">$119</span>
        </h2>
        <p className="text-sm text-[#6b6b6b] mt-1 leading-relaxed">
          $17 a class &mdash; our best rate. Save $56 vs. drop-in. Credits never expire.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
          <Link
            href={BUY_HREF}
            className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d] transition-colors"
          >
            Buy the 7-pack &rarr;
          </Link>
          {STRIPE_ENABLED && (
            <Link
              href={`/checkout/manual?pack=${OCTOBER_7PACK.packType}`}
              className="inline-flex items-center justify-center h-10 px-2 text-sm font-medium text-[#c9a96e] hover:underline"
            >
              Prefer cash?
            </Link>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[#c9a96e] bg-[#faf9f6] p-6 sm:p-8 max-w-4xl mx-auto mb-10 text-center">
      <span className="inline-block bg-[#1a1a1a] text-[#c9a96e] text-[11px] sm:text-xs font-medium tracking-[0.2em] uppercase px-3 py-1.5 rounded-full mb-4">
        Flash Sale · October 1–4 Only
      </span>
      <h3 className="text-3xl sm:text-4xl font-bold mb-2">
        7 Classes for <span className="text-[#c9a96e]">$119</span>
      </h3>
      <p className="text-lg text-[#2d2d2d] mb-1">
        $17 a class &mdash; the best rate we offer.
      </p>
      <p className="text-sm text-[#6b6b6b] max-w-md mx-auto leading-relaxed">
        That&rsquo;s 32% off the $25 drop-in rate &mdash; $56 saved. Credits never expire, so use
        them at your own pace.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <Link
          href={BUY_HREF}
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c9a96e] text-white text-base font-medium hover:bg-[#b8955d] transition-colors"
        >
          Buy the 7-Pack
        </Link>
        {STRIPE_ENABLED && (
          <Link
            href={`/checkout/manual?pack=${OCTOBER_7PACK.packType}`}
            className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-[#e5e2dc] bg-white text-[#2d2d2d] text-base font-medium hover:border-[#c9a96e] transition-colors"
          >
            Prefer cash?
          </Link>
        )}
      </div>
      <p className="text-xs text-[#6b6b6b] mt-4">
        One per member &middot; on sale through the end of October 4.
      </p>
    </div>
  );
}

/**
 * Hero overlay ribbon. Full-width strip under the nav on mobile so it can't
 * collide with the text-4xl headline, top-right pill from `sm:` up.
 */
export function OctoberPackHeroRibbon({
  purchasesEnabled = true,
}: {
  purchasesEnabled?: boolean;
}) {
  const [phase, setPhase] = useState<PromoPhase | null>(null);

  useEffect(() => {
    setPhase(promoPhase());
  }, []);

  if (!purchasesEnabled) return null;
  if (phase !== 'live') return null;

  const label = '7 Classes · $119 · Ends Oct 4';

  return (
    <Link
      href="#pricing"
      className="absolute top-0 left-0 right-0 sm:left-auto sm:top-4 sm:right-4 lg:top-6 lg:right-6 z-10 flex items-center justify-center bg-[#1a1a1a]/70 backdrop-blur-sm text-[#c9a96e] text-[11px] sm:text-sm font-medium tracking-[0.2em] uppercase px-3 py-2 sm:py-1.5 sm:rounded-full hover:bg-[#1a1a1a]/85 transition-colors"
    >
      {label}
    </Link>
  );
}
