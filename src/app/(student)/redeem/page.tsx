'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RedeemPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    kind: 'credits' | 'balance';
    credits: number;
    giftBalanceCents: number;
    creditsAfter: number;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch('/api/gift-packs/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || 'Could not redeem.');
      setSubmitting(false);
      return;
    }
    setSuccess({
      kind: data.kind || (data.gift_balance_added_cents > 0 ? 'balance' : 'credits'),
      credits: data.credits_added || 0,
      giftBalanceCents: data.gift_balance_added_cents || 0,
      creditsAfter: data.new_balance || 0,
    });
    setSubmitting(false);
  }

  if (success) {
    const giftDollars = (success.giftBalanceCents / 100).toFixed(2);
    return (
      <div className="bg-[#faf9f6] min-h-[calc(100vh-64px)] flex items-center justify-center px-5 py-10">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold mb-2">Gift redeemed</h1>
          {success.kind === 'balance' ? (
            <>
              <p className="text-[#6b6b6b] mb-1">
                <strong className="text-[#2d2d2d]">${giftDollars}</strong> gift balance added.
              </p>
              <p className="text-xs text-[#6b6b6b] mb-6">
                $25 converts to 1 class credit automatically when you book. Any leftover stays on
                your account for next time.
              </p>
            </>
          ) : (
            <p className="text-sm text-[#6b6b6b] mb-6">
              +{success.credits} class credit{success.credits === 1 ? '' : 's'} added. New
              balance: <strong className="text-[#2d2d2d]">{success.creditsAfter}</strong>
            </p>
          )}
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#faf9f6] min-h-[calc(100vh-64px)]">
      <main className="px-5 py-10 sm:py-16">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-2">Redeem</p>
          <h1 className="text-3xl font-bold">Got a gift code?</h1>
          <p className="text-sm text-[#6b6b6b] mt-2 mb-6">
            Enter the code we sent and we&rsquo;ll drop the credits straight into your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Gift code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="MM-XXXX-XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>}
            <Button type="submit" loading={submitting} className="w-full">
              Redeem
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
