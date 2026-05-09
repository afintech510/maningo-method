'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STRIPE_ENABLED } from '@/lib/feature-flags';

const PACKS = [
  { type: 'single', label: 'Drop-In', price: '$25', credits: 1 },
  { type: '5pack', label: '5-Pack', price: '$112', credits: 5 },
  { type: '10pack', label: '10-Pack', price: '$200', credits: 10 },
];

export function BuyPacks() {
  const [loading, setLoading] = useState<string | null>(null);

  function handlePurchase(packType: string) {
    setLoading(packType);
    window.location.href = STRIPE_ENABLED
      ? `/checkout/pay?kind=pack&pack=${packType}`
      : `/checkout/manual?pack=${packType}`;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Add Class Credits</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PACKS.map((pack) => (
          <button
            key={pack.type}
            onClick={() => handlePurchase(pack.type)}
            disabled={loading === pack.type}
            className="rounded-xl border border-border bg-white p-3 text-left hover:border-[#c9a96e] transition-colors disabled:opacity-50"
          >
            <p className="text-xs text-muted-foreground">{pack.label}</p>
            <p className="text-lg font-bold">{pack.price}</p>
            <p className="text-xs text-[#c9a96e]">{pack.credits} {pack.credits === 1 ? 'class' : 'classes'}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {STRIPE_ENABLED ? (
          <>
            Prefer Venmo or cash?{' '}
            <Link href="/checkout/manual?pack=5pack" className="text-[#c9a96e] hover:underline">Pay another way</Link>
            {' '}&middot;{' '}
          </>
        ) : null}
        <Link href="/redeem" className="text-[#c9a96e] hover:underline">Have a gift code?</Link>
      </p>
    </div>
  );
}
