'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IntegratedCheckout, type CheckoutSummary } from '@/components/checkout/IntegratedCheckout';
import { formatCents } from '@/lib/pricing';
import { createClient } from '@/lib/supabase/client';
import { STRIPE_ENABLED } from '@/lib/feature-flags';

const PACK_INFO: Record<string, { label: string; amount_cents: number; credits: number }> = {
  single: { label: 'Drop-In Class', amount_cents: 2500, credits: 1 },
  '5pack': { label: '5-Class Pack', amount_cents: 11200, credits: 5 },
  '10pack': { label: '10-Class Pack', amount_cents: 20000, credits: 10 },
};

export function GiftNewClient() {
  const params = useSearchParams();
  const initialPack = (params?.get('pack') || '5pack') as 'single' | '5pack' | '10pack' | 'custom';

  const [pack, setPack] = useState<'single' | '5pack' | '10pack' | 'custom'>(initialPack);
  const [customAmt, setCustomAmt] = useState('50');
  const [purchaserName, setPurchaserName] = useState('');
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderMessage, setSenderMessage] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'email' | 'share'>('share');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'venmo' | 'cash'>(
    STRIPE_ENABLED ? 'card' : 'venmo'
  );
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'unknown' | 'guest' | 'authed'>('unknown');
  const [submitting, setSubmitting] = useState(false);
  const [manualResult, setManualResult] = useState<{
    code: string;
    amount_display: string;
    label: string;
    payment_method: 'cash' | 'venmo';
    venmo_handle: string;
  } | null>(null);

  const customCents = Math.round(Number(customAmt) * 100);
  const isCustom = pack === 'custom';

  // Detect auth client-side so guest fields show only when needed
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAuthState('authed');
        setPurchaserEmail(data.user.email || '');
      } else {
        setAuthState('guest');
      }
    });
  }, []);

  const summary: CheckoutSummary = useMemo(() => {
    if (isCustom) {
      // Custom amount = dollar-balance gift card. The recipient's account
      // carries the full dollar value; we don't pre-convert it to whole
      // credits, so a $30 gift doesn't quietly lose $5.
      return {
        label: 'Custom Gift Card',
        price_display: formatCents(customCents),
        amount_cents: customCents,
        credits: 0,
        description: `${formatCents(customCents)} gift balance — converts to credits as the recipient books ($25 per credit).`,
      };
    }
    const p = PACK_INFO[pack];
    return {
      label: `Gift: ${p.label}`,
      price_display: formatCents(p.amount_cents),
      amount_cents: p.amount_cents,
      credits: p.credits,
      description: `Gift of ${p.credits} class credit${p.credits === 1 ? '' : 's'}`,
    };
  }, [pack, customCents, isCustom]);

  const intentBody = useMemo(
    () => ({
      kind: isCustom ? 'custom' : 'preset',
      pack: isCustom ? undefined : pack,
      amount_cents: isCustom ? customCents : undefined,
      recipient_name: recipientName || null,
      recipient_email: recipientEmail || null,
      sender_message: senderMessage || null,
      delivery_mode: deliveryMode,
      // Guest fields (ignored server-side when user is authed)
      purchaser_name: purchaserName || null,
      purchaser_email: purchaserEmail || null,
    }),
    [
      isCustom, pack, customCents,
      recipientName, recipientEmail, senderMessage, deliveryMode,
      purchaserName, purchaserEmail,
    ]
  );

  function validate(): string | null {
    if (authState === 'guest') {
      if (!purchaserName.trim()) return 'Your name is required so we can email you the gift code.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail)) return 'Your email looks invalid.';
    }
    if (deliveryMode === 'email') {
      if (!recipientName.trim()) return 'Recipient name is required when emailing the gift.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return 'Recipient email looks invalid.';
    }
    if (isCustom && (!customAmt || customCents < 1000)) return 'Custom gift must be at least $10.';
    return null;
  }

  async function handleContinue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (paymentMethod === 'card') {
      setShowCheckout(true);
      return;
    }

    // Manual flow — create pending gift_pack server-side and show the code.
    setSubmitting(true);
    try {
      const res = await fetch('/api/gift-packs/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: isCustom ? 'custom' : 'preset',
          pack: isCustom ? undefined : pack,
          amount_cents: isCustom ? customCents : undefined,
          recipient_name: recipientName || null,
          recipient_email: recipientEmail || null,
          sender_message: senderMessage || null,
          delivery_mode: deliveryMode,
          payment_method: paymentMethod,
          purchaser_name: purchaserName || null,
          purchaser_email: purchaserEmail || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Could not create gift. Try again.');
      } else {
        setManualResult({
          code: data.code,
          amount_display: data.amount_display,
          label: data.label,
          payment_method: data.payment_method,
          venmo_handle: data.venmo_handle,
        });
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (manualResult) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">&#10003;</div>
          <h1 className="text-2xl font-bold mb-1">Gift code created</h1>
          <p className="text-sm text-[#6b6b6b]">Activates as soon as Chelsea confirms your payment.</p>
        </div>

        <div className="rounded-2xl border border-[#e5e2dc] bg-white p-5 mb-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#6b6b6b] mb-2">Gift Code</p>
          <p className="text-2xl font-bold tracking-[0.15em] text-[#c9a96e]">{manualResult.code}</p>
          <p className="text-xs text-[#6b6b6b] mt-2">
            {manualResult.label} &middot; {manualResult.amount_display}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 mb-4 text-sm text-amber-900">
          <p className="font-semibold mb-1">How to pay</p>
          {manualResult.payment_method === 'venmo' ? (
            <p>
              Send <strong>{manualResult.amount_display}</strong> to{' '}
              <strong>{manualResult.venmo_handle}</strong> on Venmo. In the note, include your name
              and the word &ldquo;gift.&rdquo;
            </p>
          ) : (
            <p>
              Bring <strong>{manualResult.amount_display}</strong> in cash to the studio (295
              Montauk Hwy, Speonk). Hand it to Chelsea and the code activates immediately.
            </p>
          )}
        </div>

        <p className="text-xs text-[#6b6b6b] mb-4">
          We&rsquo;ve emailed you a copy of the code and payment instructions.
          {deliveryMode === 'email'
            ? ' We will email the recipient as soon as the gift is activated.'
            : ' You can share this code however you like once payment clears.'}
        </p>

        <Link href="/" className="block">
          <Button variant="ghost" className="w-full">Back home</Button>
        </Link>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => setShowCheckout(false)}
          className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] mb-6"
        >
          &larr; Back to gift details
        </button>
        <IntegratedCheckout
          kind="gift_pack"
          pack={isCustom ? undefined : pack}
          amountCents={isCustom ? customCents : undefined}
          summary={summary}
          intentEndpoint="/api/gift-packs/intent"
          intentBody={intentBody}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-2">Gift a Pack</p>
        <h1 className="text-3xl font-bold">Send a Maningo Method gift</h1>
        <p className="text-sm text-[#6b6b6b] mt-2">
          Pick a pack, decide how to deliver it, and we&rsquo;ll generate a unique gift code on payment. No account required.
        </p>
      </div>

      <form onSubmit={handleContinue} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Pack</label>
          <div className="grid grid-cols-2 gap-2">
            {(['single', '5pack', '10pack', 'custom'] as const).map((opt) => {
              const on = pack === opt;
              const info = opt === 'custom' ? null : PACK_INFO[opt];
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPack(opt)}
                  className={`min-h-[52px] rounded-xl border-2 p-3 text-left transition-colors ${
                    on ? 'border-[#c9a96e] bg-[#faf9f6]' : 'border-[#e5e2dc] bg-white hover:border-[#c9a96e]/50'
                  }`}
                >
                  <p className="font-medium">{opt === 'custom' ? 'Custom amount' : info!.label}</p>
                  <p className="text-xs text-[#6b6b6b]">{opt === 'custom' ? 'You pick' : formatCents(info!.amount_cents)}</p>
                </button>
              );
            })}
          </div>
        </div>

        {isCustom && (
          <Input
            label="Custom amount (USD)"
            type="number"
            min={10}
            step={5}
            value={customAmt}
            onChange={(e) => setCustomAmt(e.target.value)}
            placeholder="50"
            required
          />
        )}

        {authState === 'guest' && (
          <div className="rounded-2xl border border-[#e5e2dc] bg-white p-4 space-y-3">
            <p className="text-sm font-medium">Your details</p>
            <Input
              label="Your name"
              value={purchaserName}
              onChange={(e) => setPurchaserName(e.target.value)}
              required
              placeholder="Full name"
              autoComplete="name"
            />
            <Input
              label="Your email"
              type="email"
              inputMode="email"
              value={purchaserEmail}
              onChange={(e) => setPurchaserEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
            <p className="text-xs text-[#6b6b6b]">
              We&rsquo;ll email you the gift code &amp; a receipt.{' '}
              <Link href="/login?next=/gift/new" className="text-[#c9a96e] hover:underline">Have an account? Log in</Link>
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">How should we deliver it?</label>
          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer ${
                deliveryMode === 'email' ? 'border-[#c9a96e] bg-[#faf9f6]' : 'border-[#e5e2dc] bg-white'
              }`}
            >
              <input
                type="radio"
                name="delivery"
                checked={deliveryMode === 'email'}
                onChange={() => setDeliveryMode('email')}
                className="mt-1 h-4 w-4 text-[#c9a96e]"
              />
              <div>
                <p className="font-medium text-sm">Email the recipient directly</p>
                <p className="text-xs text-[#6b6b6b]">We send them the gift code with your message.</p>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer ${
                deliveryMode === 'share' ? 'border-[#c9a96e] bg-[#faf9f6]' : 'border-[#e5e2dc] bg-white'
              }`}
            >
              <input
                type="radio"
                name="delivery"
                checked={deliveryMode === 'share'}
                onChange={() => setDeliveryMode('share')}
                className="mt-1 h-4 w-4 text-[#c9a96e]"
              />
              <div>
                <p className="font-medium text-sm">Just give me the code</p>
                <p className="text-xs text-[#6b6b6b]">We email the code to you so you can deliver it however you like (text, card, in person).</p>
              </div>
            </label>
          </div>
        </div>

        <Input
          label={deliveryMode === 'email' ? 'Recipient name' : 'Recipient name (optional)'}
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          required={deliveryMode === 'email'}
          placeholder="Their full name"
        />
        <Input
          label={deliveryMode === 'email' ? 'Recipient email' : 'Recipient email (optional)'}
          type="email"
          inputMode="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          required={deliveryMode === 'email'}
          placeholder="them@example.com"
        />

        <div>
          <label className="block text-sm font-medium mb-1.5">Personal message (optional)</label>
          <textarea
            value={senderMessage}
            onChange={(e) => setSenderMessage(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Happy birthday! Treat yourself — Mom"
            className="w-full px-3 py-2 rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent resize-none"
          />
          <p className="text-xs text-[#6b6b6b] mt-1">{senderMessage.length}/280</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Payment method</label>
          <div className="grid grid-cols-1 gap-2">
            {STRIPE_ENABLED && (
              <PaymentOption
                on={paymentMethod === 'card'}
                onClick={() => setPaymentMethod('card')}
                title="Pay with card"
                hint={`Card, Apple Pay, Google Pay via Stripe · instant activation · +3% service fee`}
              />
            )}
            <PaymentOption
              on={paymentMethod === 'venmo'}
              onClick={() => setPaymentMethod('venmo')}
              title="Venmo"
              hint="Send to @Chelsea-Maningo. Code activates after Chelsea confirms."
              badge={STRIPE_ENABLED ? 'Save 3%' : undefined}
            />
            <PaymentOption
              on={paymentMethod === 'cash'}
              onClick={() => setPaymentMethod('cash')}
              title="Cash at the studio"
              hint="Hand $ to Chelsea at 295 Montauk Hwy, Speonk."
              badge={STRIPE_ENABLED ? 'Save 3%' : undefined}
            />
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>}

        <Button
          type="submit"
          className="w-full"
          disabled={authState === 'unknown'}
          loading={submitting}
        >
          {paymentMethod === 'card' ? 'Continue to payment' : 'Get gift code'}
        </Button>
      </form>
    </div>
  );
}

function PaymentOption({
  on,
  onClick,
  title,
  hint,
  badge,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  hint: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`relative min-h-[64px] rounded-xl border-2 p-3 text-left transition-colors ${
        on ? 'border-[#c9a96e] bg-[#faf9f6]' : 'border-[#e5e2dc] bg-white hover:border-[#c9a96e]/50'
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
          {badge}
        </span>
      )}
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-[#6b6b6b]">{hint}</p>
    </button>
  );
}
