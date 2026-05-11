'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Drop-in "Have a gift card?" panel for the pack-checkout pages. Collapsed by
 * default; expands to an input + Apply button. On success we show the new
 * credit balance and a "Go to dashboard" CTA — most users hit a gift redeem
 * instead of (not in addition to) the pack purchase.
 */
export function RedeemGiftInline({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
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
    if (!code.trim()) {
      setError('Enter your gift code.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/gift-packs/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data?.error?.message || 'Could not redeem.');
      return;
    }
    setSuccess({
      kind: data.kind || (data.gift_balance_added_cents > 0 ? 'balance' : 'credits'),
      credits: data.credits_added || 0,
      giftBalanceCents: data.gift_balance_added_cents || 0,
      creditsAfter: data.new_balance || 0,
    });
  }

  if (success) {
    const giftDollars = (success.giftBalanceCents / 100).toFixed(2);
    return (
      <div className={`rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 ${className}`}>
        {success.kind === 'balance' ? (
          <>
            <p className="text-sm font-semibold text-emerald-900">
              ${giftDollars} gift balance added.
            </p>
            <p className="text-xs text-emerald-800 mt-1">
              $25 converts to 1 class credit automatically when you book. Any leftover stays on
              your account for next time.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-emerald-900">
              +{success.credits} class credit{success.credits === 1 ? '' : 's'} added.
            </p>
            <p className="text-xs text-emerald-800 mt-1">
              New balance: <strong>{success.creditsAfter}</strong>. You can stop here and book a
              class, or continue this purchase if you want more credits.
            </p>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800"
          >
            Go to dashboard
          </Link>
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center h-9 px-4 rounded-full border border-emerald-300 text-emerald-900 text-xs font-medium hover:bg-emerald-100"
          >
            Book a class
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-[#e5e2dc] bg-white ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-[#1a1a1a]">Have a gift card?</span>
        <span className={`text-[#6b6b6b] transition-transform ${open ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3">
          <p className="text-xs text-[#6b6b6b]">
            Enter your code to add its credits to your account. Once redeemed, those credits work like
            any pack purchase.
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="MM-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="w-full h-11 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm tracking-wider"
          />
          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d] disabled:opacity-60"
          >
            {submitting ? 'Applying…' : 'Apply gift code'}
          </button>
        </form>
      )}
    </div>
  );
}
