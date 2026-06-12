'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCents } from '@/lib/pricing';

interface Props {
  packType: 'single' | '5pack' | '10pack';
  amountCents: number;
  discountCode?: string;
}

export function ManualPayInline({ packType, amountCents, discountCode }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch('/api/manual-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pack_type: packType,
        payment_method: 'cash',
        ...(discountCode ? { discount_code: discountCode } : {}),
      }),
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
          <div className="space-y-2 text-sm">
            <p>Bring <strong>{formatCents(amountCents)}</strong> in cash to your first class.</p>
            <p className="text-[#6b6b6b]">Chelsea will mark you paid after you hand it over.</p>
          </div>
        </Card>

        <Link href="/dashboard" className="block mt-4">
          <Button variant="ghost" className="w-full">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Pay with cash</h2>
      <p className="text-xs text-[#6b6b6b] mb-5">
        No service fee. Your full pack lands on your account immediately — book any class right
        away and pay Chelsea in cash at your first class.
      </p>

      <div className="mb-5 p-3 rounded-xl border-2 border-[#c9a96e] bg-[#faf9f6]">
        <p className="font-medium">Cash</p>
        <p className="text-xs text-[#6b6b6b]">Pay at your first class</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 mb-3">{error}</div>}

      <Button onClick={handleSubmit} loading={submitting} className="w-full">
        Submit payment request
      </Button>
    </div>
  );
}
