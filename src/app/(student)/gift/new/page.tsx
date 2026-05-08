'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IntegratedCheckout, type CheckoutSummary } from '@/components/checkout/IntegratedCheckout';
import { formatCents } from '@/lib/pricing';

const PACK_INFO: Record<string, { label: string; amount_cents: number; credits: number }> = {
  single: { label: 'Drop-In Class', amount_cents: 2500, credits: 1 },
  '5pack': { label: '5-Class Pack', amount_cents: 11200, credits: 5 },
  '10pack': { label: '10-Class Pack', amount_cents: 20000, credits: 10 },
};

function GiftNewContent() {
  const params = useSearchParams();
  const initialPack = (params?.get('pack') || '5pack') as 'single' | '5pack' | '10pack' | 'custom';

  const [pack, setPack] = useState<'single' | '5pack' | '10pack' | 'custom'>(initialPack);
  const [customAmt, setCustomAmt] = useState('50');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderMessage, setSenderMessage] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'email' | 'share'>('share');
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customCents = Math.round(Number(customAmt) * 100);
  const isCustom = pack === 'custom';

  const summary: CheckoutSummary = useMemo(() => {
    if (isCustom) {
      return {
        label: 'Custom Gift Pack',
        price_display: formatCents(customCents),
        amount_cents: customCents,
        credits: Math.floor(customCents / 2500),
        description: 'A custom-amount gift toward Maningo Method classes',
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
    }),
    [isCustom, pack, customCents, recipientName, recipientEmail, senderMessage, deliveryMode]
  );

  function handleContinue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (deliveryMode === 'email') {
      if (!recipientName.trim()) {
        setError('Recipient name is required when emailing the gift.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        setError('Recipient email looks invalid.');
        return;
      }
    }
    if (isCustom && (!customAmt || customCents < 1000)) {
      setError('Custom gift must be at least $10.');
      return;
    }
    setShowCheckout(true);
  }

  if (showCheckout) {
    return (
      <div>
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
          Pick a pack, decide how to deliver it, and we&rsquo;ll generate a unique gift code on payment.
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

        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>}

        <Button type="submit" className="w-full">
          Continue to payment
        </Button>
        <p className="text-center">
          <Link href="/dashboard" className="text-xs text-[#6b6b6b] hover:underline">
            Cancel
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function GiftNewPage() {
  return (
    <div className="bg-[#faf9f6] min-h-[calc(100vh-64px)]">
      <main className="px-5 py-8 sm:py-12">
        <Suspense fallback={null}>
          <GiftNewContent />
        </Suspense>
      </main>
    </div>
  );
}
