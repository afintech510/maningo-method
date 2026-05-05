'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PACK_INFO: Record<string, { label: string; price: string; credits: number }> = {
  single: { label: 'Drop-In Class', price: '$25', credits: 1 },
  '5pack': { label: '5-Class Pack', price: '$112', credits: 5 },
  '10pack': { label: '10-Class Pack', price: '$200', credits: 10 },
};

const VENMO_HANDLE = '@Chelsea-Maningo';
const ZELLE_TARGET = 'chelsea@maningomethod.com';

function ManualCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packType = searchParams?.get('pack') || '5pack';
  const pack = PACK_INFO[packType] || PACK_INFO['5pack'];

  const [method, setMethod] = useState<'cash' | 'zelle' | 'venmo'>('venmo');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const res = await fetch('/api/manual-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack_type: packType, payment_method: method }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || 'Could not submit. Try again.');
      setLoading(false);
      return;
    }
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-5 py-12">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">&#10003;</div>
          <h1 className="text-2xl font-bold mb-2">Payment Recorded</h1>
          <p className="text-[#6b6b6b] text-sm">
            Chelsea will confirm receipt and your credits will appear on your dashboard. Most are turned around within a day.
          </p>
        </div>

        <Card className="mb-6">
          <p className="text-sm font-semibold mb-3">How to pay {pack.price}</p>
          {method === 'venmo' && (
            <div className="space-y-2 text-sm">
              <p>Send <strong>{pack.price}</strong> to <strong>{VENMO_HANDLE}</strong> on Venmo.</p>
              <p className="text-[#6b6b6b]">In the note, please put your full name + &quot;{pack.label}&quot; so Chelsea can match it up quickly.</p>
            </div>
          )}
          {method === 'zelle' && (
            <div className="space-y-2 text-sm">
              <p>Send <strong>{pack.price}</strong> via Zelle to <strong>{ZELLE_TARGET}</strong>.</p>
              <p className="text-[#6b6b6b]">In the memo, please put your full name + &quot;{pack.label}&quot;.</p>
            </div>
          )}
          {method === 'cash' && (
            <div className="space-y-2 text-sm">
              <p>Bring <strong>{pack.price}</strong> in cash to your first class.</p>
              <p className="text-[#6b6b6b]">Chelsea will mark you paid after you hand it over and your credits will land instantly.</p>
            </div>
          )}
        </Card>

        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1">
            <Button variant="ghost" className="w-full">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-12">
      <button onClick={() => router.back()} className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] mb-6">&larr; Back</button>

      <h1 className="text-2xl font-bold mb-2">Pay another way</h1>
      <p className="text-sm text-[#6b6b6b] mb-6">Credits apply once Chelsea confirms payment. Usually within a day.</p>

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{pack.label}</p>
            <p className="text-xs text-[#6b6b6b]">{pack.credits} credit{pack.credits === 1 ? '' : 's'}</p>
          </div>
          <p className="text-xl font-bold">{pack.price}</p>
        </div>
      </Card>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 mb-4">{error}</div>}

      <div className="space-y-2 mb-6">
        {(['venmo', 'zelle', 'cash'] as const).map((m) => (
          <label
            key={m}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              method === m ? 'border-[#c9a96e] bg-[#faf9f6]' : 'border-[#e5e2dc] bg-white hover:border-[#c9a96e]/50'
            }`}
          >
            <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="h-4 w-4 text-[#c9a96e]" />
            <div className="flex-1">
              <p className="font-medium capitalize">{m === 'venmo' ? 'Venmo (direct)' : m}</p>
              <p className="text-xs text-[#6b6b6b]">
                {m === 'venmo' && `Send to ${VENMO_HANDLE}`}
                {m === 'zelle' && `Send to ${ZELLE_TARGET}`}
                {m === 'cash' && 'Pay at your first class'}
              </p>
            </div>
          </label>
        ))}
      </div>

      <Button onClick={handleSubmit} loading={loading} className="w-full">
        Submit Payment Request
      </Button>

      <p className="text-xs text-[#6b6b6b] text-center mt-4">
        Prefer card? <Link href="/dashboard" className="text-[#c9a96e] underline">Go back and use Stripe</Link> for instant credits.
      </p>
    </div>
  );
}

export default function ManualCheckoutPage() {
  return (
    <Suspense fallback={null}>
      <ManualCheckoutContent />
    </Suspense>
  );
}
