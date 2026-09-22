'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STRIPE_ENABLED } from '@/lib/feature-flags';
import { PurchasesClosedNotice } from '@/components/marketing/PurchasesClosedNotice';

const PACKS = [
  { type: 'single', label: 'Drop-In', price: '$25', credits: 1 },
  { type: '5pack', label: '5-Pack', price: '$112', credits: 5 },
  { type: '10pack', label: '10-Pack', price: '$200', credits: 10 },
];

/**
 * `sellablePacks` lists the pack types currently on sale. Packs not in it stay
 * on screen with their price but aren't buy buttons, so members can still see
 * what normal pricing looks like.
 */
export function BuyPacks({ sellablePacks = PACKS.map((p) => p.type) }: { sellablePacks?: string[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const anySellable = sellablePacks.length > 0;
  const cashPack = sellablePacks.includes('5pack') ? '5pack' : sellablePacks[0];

  function handlePurchase(packType: string) {
    if (!sellablePacks.includes(packType)) return;
    setLoading(packType);
    window.location.href = STRIPE_ENABLED
      ? `/checkout/pay?kind=pack&pack=${packType}`
      : `/checkout/manual?pack=${packType}`;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Add Class Credits</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PACKS.map((pack) => {
          const sellable = sellablePacks.includes(pack.type);
          const body = (
            <>
              <p className="text-xs text-muted-foreground">{pack.label}</p>
              <p className="text-lg font-bold">{pack.price}</p>
              <p className="text-xs text-[#c9a96e]">{pack.credits} {pack.credits === 1 ? 'class' : 'classes'}</p>
            </>
          );

          // A plain div, not a disabled button, so it doesn't read as a broken
          // control to keyboard and screen-reader users.
          return sellable ? (
            <button
              key={pack.type}
              onClick={() => handlePurchase(pack.type)}
              disabled={loading === pack.type}
              className="rounded-xl border border-border bg-white p-3 text-left hover:border-[#c9a96e] transition-colors disabled:opacity-50"
            >
              {body}
            </button>
          ) : (
            <div
              key={pack.type}
              aria-disabled
              className="rounded-xl border border-border bg-white p-3 text-left opacity-50"
            >
              {body}
            </div>
          );
        })}
      </div>

      {!anySellable && <PurchasesClosedNotice className="mt-3" />}

      <p className="text-xs text-muted-foreground mt-2">
        {anySellable && STRIPE_ENABLED ? (
          <>
            Prefer cash?{' '}
            <Link href={`/checkout/manual?pack=${cashPack}`} className="text-[#c9a96e] hover:underline">Pay with cash</Link>
            {' '}&middot;{' '}
          </>
        ) : null}
        <Link href="/redeem" className="text-[#c9a96e] hover:underline">Have a gift code?</Link>
      </p>
    </div>
  );
}
