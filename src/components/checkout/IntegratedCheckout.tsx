'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { getStripeJs } from '@/lib/stripe-client';
import { Button } from '@/components/ui/Button';
import { withServiceFee, formatCents } from '@/lib/pricing';

type Kind = 'pack' | 'gift_pack' | 'gift_custom';

export interface CheckoutSummary {
  label: string;
  price_display: string;
  amount_cents: number;
  credits: number;
  description?: string;
}

interface Props {
  kind: Kind;
  pack?: string;
  amountCents?: number; // for gift_custom
  summary: CheckoutSummary;
  // Allow callers (e.g. gift checkout) to override the intent endpoint
  intentEndpoint?: string;
  intentBody?: Record<string, unknown>;
}

export function IntegratedCheckout({
  kind,
  pack,
  amountCents,
  summary,
  intentEndpoint,
  intentBody,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Discount code (review-request 15%, etc.). When applied, we refire the
  // intent fetch so Stripe charges the new amount.
  const [discountInput, setDiscountInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{ code: string; percent: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Pack flows go through Stripe Checkout (separate endpoint that supports
  // dynamic Stripe coupons). Inline payment-element flows here apply the
  // discount server-side to the PaymentIntent amount.
  const supportsDiscount = !intentEndpoint && (kind === 'pack' || kind === 'gift_pack' || kind === 'gift_custom');

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setClientSecret(null);

    const endpoint = intentEndpoint || '/api/checkout/intent';
    const body = intentBody ?? {
      kind,
      pack,
      amount_cents: amountCents,
      ...(applied ? { discount_code: applied.code } : {}),
    };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = `/register?pack=${pack || '5pack'}`;
            return;
          }
          setError(data?.error?.message || 'Could not start checkout.');
          return;
        }
        setClientSecret(data.client_secret);
      })
      .catch(() => {
        if (!cancelled) setError('Network error. Please try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [kind, pack, amountCents, intentEndpoint, intentBody, applied]);

  async function applyCode() {
    setDiscountError(null);
    const code = discountInput.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    try {
      const res = await fetch('/api/discount-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!data.valid) {
        setDiscountError(data.error || 'Invalid code.');
        return;
      }
      setApplied({ code: data.code, percent: Number(data.discount_value) });
    } catch {
      setDiscountError('Could not check that code. Try again.');
    } finally {
      setApplying(false);
    }
  }

  function clearCode() {
    setApplied(null);
    setDiscountInput('');
    setDiscountError(null);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_440px] gap-8 max-w-5xl mx-auto">
      <CheckoutSummaryPane summary={summary} applied={applied} />
      <div className="lg:order-1 order-2 bg-white rounded-2xl border border-[#e5e2dc] p-6 sm:p-8 shadow-sm h-fit">
        <h2 className="text-lg font-semibold mb-1">Pay securely</h2>
        <p className="text-xs text-[#6b6b6b] mb-5">Card, Apple Pay, Google Pay, Venmo &mdash; whichever&rsquo;s easiest.</p>

        {supportsDiscount && (
          <DiscountCodeRow
            value={discountInput}
            onChange={setDiscountInput}
            onApply={applyCode}
            onClear={clearCode}
            applying={applying}
            applied={applied}
            error={discountError}
          />
        )}

        {error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
        ) : !clientSecret ? (
          <SkeletonForm />
        ) : (
          <StripeWrapper clientSecret={clientSecret} />
        )}
        <p className="text-[10px] text-[#9a9a9a] text-center mt-5 leading-relaxed">
          Payments are processed securely by <strong>Stripe</strong>. We never see your card details.
        </p>
      </div>
    </div>
  );
}

function DiscountCodeRow({
  value,
  onChange,
  onApply,
  onClear,
  applying,
  applied,
  error,
}: {
  value: string;
  onChange: (s: string) => void;
  onApply: () => void;
  onClear: () => void;
  applying: boolean;
  applied: { code: string; percent: number } | null;
  error: string | null;
}) {
  if (applied) {
    return (
      <div className="mb-5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center justify-between">
        <p className="text-sm text-emerald-800">
          <span className="font-semibold">{applied.code}</span> applied &middot; {applied.percent}% off
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-emerald-800 underline hover:no-underline"
        >
          Remove
        </button>
      </div>
    );
  }
  return (
    <div className="mb-5">
      <label className="block text-xs uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5">
        Discount code
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="REVIEW-XXXXXX"
          className="flex-1 h-11 px-3 rounded-lg border border-[#e5e2dc] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
        />
        <Button size="sm" onClick={onApply} loading={applying} disabled={!value.trim()}>
          Apply
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function CheckoutSummaryPane({
  summary,
  applied,
}: {
  summary: CheckoutSummary;
  applied: { code: string; percent: number } | null;
}) {
  const discountCents = applied
    ? Math.round(summary.amount_cents * (applied.percent / 100))
    : 0;
  const discountedBase = summary.amount_cents - discountCents;
  const fee = withServiceFee(discountedBase);
  return (
    <div className="lg:order-2 order-1 lg:sticky lg:top-6 h-fit">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c9a96e] mb-3">Order Summary</p>
      <div className="bg-[#faf9f6] rounded-2xl border border-[#e5e2dc] p-6">
        <div className="flex items-start justify-between pb-4 border-b border-[#e5e2dc]">
          <div>
            <p className="font-semibold text-lg">{summary.label}</p>
            {summary.description && <p className="text-sm text-[#6b6b6b] mt-1">{summary.description}</p>}
            {summary.credits > 0 && (
              <p className="text-xs text-[#c9a96e] font-medium mt-2">
                {summary.credits} class credit{summary.credits === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <p className="text-xl font-bold whitespace-nowrap">{formatCents(summary.amount_cents)}</p>
        </div>
        <div className="flex items-center justify-between pt-4 text-sm">
          <span className="text-[#6b6b6b]">Subtotal</span>
          <span>{formatCents(summary.amount_cents)}</span>
        </div>
        {applied && (
          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="text-emerald-700">Discount ({applied.code} &middot; {applied.percent}%)</span>
            <span className="text-emerald-700">−{formatCents(discountCents)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 text-sm">
          <span className="text-[#6b6b6b]">Service fee (3%)</span>
          <span className="text-[#6b6b6b]">{formatCents(fee.fee_cents)}</span>
        </div>
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#e5e2dc] font-semibold text-base">
          <span>Total</span>
          <span>{formatCents(fee.total_cents)}</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-[#6b6b6b]">
        Skip the 3% fee &mdash; pay with Cash, Zelle, or Venmo using the toggle above.
      </p>
      <ul className="mt-5 space-y-2 text-xs text-[#6b6b6b]">
        <li className="flex items-start gap-2"><span className="text-[#c9a96e]">&#10003;</span> Credits never expire</li>
        <li className="flex items-start gap-2"><span className="text-[#c9a96e]">&#10003;</span> Cancel up to 12 hours before class for full credit refund</li>
        <li className="flex items-start gap-2"><span className="text-[#c9a96e]">&#10003;</span> 3-day cancellation right under NY law</li>
      </ul>
    </div>
  );
}

function SkeletonForm() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-12 bg-[#f0eee8] rounded-lg" />
      <div className="h-12 bg-[#f0eee8] rounded-lg" />
      <div className="h-12 bg-[#f0eee8] rounded-lg" />
      <div className="h-11 bg-[#f0eee8] rounded-full mt-4" />
    </div>
  );
}

function StripeWrapper({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements
      stripe={getStripeJs()}
      options={{
        clientSecret,
        appearance: {
          theme: 'flat',
          variables: {
            colorPrimary: '#c9a96e',
            colorText: '#2d2d2d',
            colorBackground: '#ffffff',
            colorDanger: '#b91c1c',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            spacingUnit: '4px',
            borderRadius: '10px',
            fontSizeBase: '15px',
          },
          rules: {
            '.Input': {
              border: '1px solid #e5e2dc',
              boxShadow: 'none',
              padding: '12px',
            },
            '.Input:focus': {
              border: '1px solid #c9a96e',
              boxShadow: '0 0 0 3px rgba(201,169,110,0.15)',
            },
            '.Tab': {
              border: '1px solid #e5e2dc',
              boxShadow: 'none',
              color: '#2d2d2d',
              backgroundColor: '#ffffff',
            },
            '.Tab:hover': {
              color: '#2d2d2d',
              border: '1px solid #c9a96e',
            },
            '.Tab--selected': {
              border: '1px solid #c9a96e',
              backgroundColor: '#ffffff',
              color: '#2d2d2d',
              boxShadow: '0 0 0 1px #c9a96e inset',
            },
            '.Tab--selected:focus': {
              color: '#2d2d2d',
              border: '1px solid #c9a96e',
              boxShadow: '0 0 0 1px #c9a96e inset',
            },
            '.TabIcon--selected': {
              fill: '#c9a96e',
            },
            '.TabLabel--selected': {
              color: '#2d2d2d',
            },
            '.Label': {
              color: '#6b6b6b',
              fontWeight: '500',
            },
          },
        },
      }}
    >
      <PaymentForm />
    </Elements>
  );
}

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErrMsg(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-success?type=pack`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrMsg(error.message || 'Payment failed. Please try again.');
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      router.push(`/booking-success?type=pack&pi=${paymentIntent.id}`);
      return;
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {errMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{errMsg}</div>
      )}
      <Button type="submit" loading={submitting} disabled={!stripe || !elements} className="w-full">
        Complete Purchase
      </Button>
    </form>
  );
}
