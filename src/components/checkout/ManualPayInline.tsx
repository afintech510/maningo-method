'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCents } from '@/lib/pricing';

const VENMO_HANDLE = '@Chelsea-Maningo';

interface Props {
  packType: 'single' | '5pack' | '10pack';
  amountCents: number;
  packLabel: string;
}

export function ManualPayInline({ packType, amountCents, packLabel }: Props) {
  const [method, setMethod] = useState<'venmo' | 'cash'>('venmo');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch('/api/manual-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack_type: packType, payment_method: method }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || 'Could not submit. Try again.');
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div>
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">&#10003;</div>
          <h3 className="text-lg font-semibold">You&rsquo;re set — credits added</h3>
          <p className="text-sm text-[#6b6b6b]">
            Your full pack is on your dashboard. Book any class right away — Chelsea will reconcile
            the payment on her side.
          </p>
        </div>

        <Card>
          <p className="text-sm font-semibold mb-3">How to pay {formatCents(amountCents)}</p>
          {method === 'venmo' && (
            <div className="space-y-2 text-sm">
              <p>Send <strong>{formatCents(amountCents)}</strong> to <strong>{VENMO_HANDLE}</strong> on Venmo.</p>
              <p className="text-[#6b6b6b]">In the note, please put your full name + &quot;{packLabel}&quot;.</p>
            </div>
          )}
          {method === 'cash' && (
            <div className="space-y-2 text-sm">
              <p>Bring <strong>{formatCents(amountCents)}</strong> in cash to your first class.</p>
              <p className="text-[#6b6b6b]">Chelsea will mark you paid after you hand it over.</p>
            </div>
          )}
        </Card>

        <Link href="/dashboard" className="block mt-4">
          <Button variant="ghost" className="w-full">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Pay another way</h2>
      <p className="text-xs text-[#6b6b6b] mb-5">
        No service fee. Your full pack lands on your account immediately — book any class right
        away and settle up with Chelsea when you come in.
      </p>

      <div className="space-y-2 mb-5">
        {(['venmo', 'cash'] as const).map((m) => (
          <label
            key={m}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
              method === m ? 'border-[#c9a96e] bg-[#faf9f6]' : 'border-[#e5e2dc] bg-white hover:border-[#c9a96e]/50'
            }`}
          >
            <input type="radio" name="manual_method" value={m} checked={method === m} onChange={() => setMethod(m)} className="h-4 w-4 text-[#c9a96e]" />
            <div className="flex-1">
              <p className="font-medium capitalize">{m === 'venmo' ? 'Venmo (direct)' : m}</p>
              <p className="text-xs text-[#6b6b6b]">
                {m === 'venmo' && `Send to ${VENMO_HANDLE}`}
                {m === 'cash' && 'Pay at your first class'}
              </p>
            </div>
          </label>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 mb-3">{error}</div>}

      <Button onClick={handleSubmit} loading={submitting} className="w-full">
        Submit payment request
      </Button>
    </div>
  );
}
