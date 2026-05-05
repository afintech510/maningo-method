'use client';

import { useState } from 'react';

const PACKS = [
  { type: 'single', label: 'Drop-In', price: '$25', credits: 1 },
  { type: '5pack', label: '5-Pack', price: '$112', credits: 5 },
  { type: '10pack', label: '10-Pack', price: '$200', credits: 10 },
];

export function BuyPacks() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePurchase(packType: string) {
    setLoading(packType);
    try {
      const res = await fetch('/api/packs/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_type: packType }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      setLoading(null);
    }
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
    </div>
  );
}
