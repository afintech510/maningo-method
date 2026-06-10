'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IntegratedCheckout, type CheckoutSummary } from '@/components/checkout/IntegratedCheckout';
import { ManualPayInline } from '@/components/checkout/ManualPayInline';
import { RedeemGiftInline } from '@/components/checkout/RedeemGiftInline';
import { DiscountField, discountCentsFor, discountLabel, useDiscountCode } from '@/components/checkout/DiscountField';
import { formatCents } from '@/lib/pricing';
import { STRIPE_ENABLED } from '@/lib/feature-flags';

const PACK_INFO: Record<string, CheckoutSummary> = {
  single: { label: 'Drop-In Class', price_display: '$25.00', amount_cents: 2500, credits: 1, description: 'One mat Pilates / sculpt class' },
  '5pack': { label: '5-Class Pack', price_display: '$112.00', amount_cents: 11200, credits: 5, description: 'Five classes, 10% off' },
  '10pack': { label: '10-Class Pack', price_display: '$200.00', amount_cents: 20000, credits: 10, description: 'Ten classes, 20% off' },
};

export function CheckoutPayClient() {
  const searchParams = useSearchParams();
  const kindParam = searchParams?.get('kind') || 'pack';
  const pack = searchParams?.get('pack') || '5pack';
  const customAmt = Number(searchParams?.get('amount_cents') || '0');

  if (!STRIPE_ENABLED) {
    return (
      <ErrorPanel message="Card checkout is temporarily unavailable. Please use the Cash or Venmo option from the home page or your dashboard." />
    );
  }

  if (kindParam === 'gift_custom') {
    if (!customAmt || customAmt < 1000) {
      return <ErrorPanel message="Minimum custom gift is $10. Go back and pick an amount." />;
    }
    const summary: CheckoutSummary = {
      label: 'Custom Gift Pack',
      price_display: `$${(customAmt / 100).toFixed(2)}`,
      amount_cents: customAmt,
      credits: 0,
      description: 'A custom-amount gift toward Maningo Method classes',
    };
    return <IntegratedCheckout kind="gift_custom" amountCents={customAmt} summary={summary} />;
  }

  const base = PACK_INFO[pack];
  if (!base) return <ErrorPanel message="That pack does not exist." />;

  if (kindParam === 'gift_pack') {
    const summary: CheckoutSummary = {
      ...base,
      label: `Gift: ${base.label}`,
      description: `Gift of ${base.credits} class credit${base.credits === 1 ? '' : 's'}`,
    };
    return <IntegratedCheckout kind="gift_pack" pack={pack} summary={summary} />;
  }

  // kind === 'pack' — show payment-method toggle (Card vs Cash/Zelle/Venmo)
  return (
    <>
      <div className="max-w-5xl mx-auto mb-4">
        <RedeemGiftInline />
      </div>
      <PackCheckoutWithToggle pack={pack as 'single' | '5pack' | '10pack'} summary={base} />
    </>
  );
}

function PackCheckoutWithToggle({
  pack,
  summary,
}: {
  pack: 'single' | '5pack' | '10pack';
  summary: CheckoutSummary;
}) {
  const [method, setMethod] = useState<'card' | 'manual'>('card');
  // One discount state shared across card + cash/Venmo, so an applied code
  // carries over when the buyer switches payment method.
  const discount = useDiscountCode();

  if (method === 'card') {
    return (
      <div>
        <PaymentMethodToggle method={method} setMethod={setMethod} />
        <IntegratedCheckout kind="pack" pack={pack} summary={summary} discountState={discount} />
      </div>
    );
  }

  // Manual mode: show our own summary (no fee) + ManualPayInline
  const discountCents = discountCentsFor(discount.applied, summary.amount_cents);
  const owedCents = summary.amount_cents - discountCents;
  return (
    <div>
      <PaymentMethodToggle method={method} setMethod={setMethod} />
      <div className="grid lg:grid-cols-[1fr_440px] gap-8 max-w-5xl mx-auto">
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
            {discount.applied && (
              <div className="flex items-center justify-between pt-2 text-sm">
                <span className="text-emerald-700">Discount ({discount.applied.code} &middot; {discountLabel(discount.applied)})</span>
                <span className="text-emerald-700">−{formatCents(discountCents)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 text-sm">
              <span className="text-[#6b6b6b]">Service fee</span>
              <span className="text-emerald-600 font-medium">$0.00</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#e5e2dc] font-semibold text-base">
              <span>Total</span>
              <span>{formatCents(owedCents)}</span>
            </div>

            <div className="mt-4 pt-4 border-t border-[#e5e2dc]">
              <DiscountField
                value={discount.input}
                onChange={discount.setInput}
                onApply={discount.applyCode}
                onClear={discount.clearCode}
                applying={discount.applying}
                applied={discount.applied}
                error={discount.error}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-700">You&rsquo;re saving the 3% service fee by paying outside of card.</p>
        </div>

        <div className="lg:order-1 order-2 bg-white rounded-2xl border border-[#e5e2dc] p-6 sm:p-8 shadow-sm h-fit">
          <ManualPayInline
            packType={pack}
            amountCents={owedCents}
            packLabel={summary.label}
            discountCode={discount.applied?.code}
          />
        </div>
      </div>
    </div>
  );
}

function PaymentMethodToggle({
  method,
  setMethod,
}: {
  method: 'card' | 'manual';
  setMethod: (m: 'card' | 'manual') => void;
}) {
  return (
    <div className="max-w-5xl mx-auto mb-6">
      <p className="text-xs text-[#6b6b6b] uppercase tracking-[0.2em] mb-2">Payment Method</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMethod('card')}
          className={`min-h-[64px] rounded-xl border-2 p-3 text-left transition-colors ${
            method === 'card' ? 'border-[#c9a96e] bg-white' : 'border-[#e5e2dc] bg-white hover:border-[#c9a96e]/50'
          }`}
        >
          <p className="font-semibold">Pay with card</p>
          <p className="text-xs text-[#6b6b6b]">Card, Apple Pay, Google Pay via Stripe &middot; instant credits &middot; +3% service fee</p>
        </button>
        <button
          type="button"
          onClick={() => setMethod('manual')}
          className={`min-h-[64px] rounded-xl border-2 p-3 text-left transition-colors relative ${
            method === 'manual' ? 'border-[#c9a96e] bg-white' : 'border-[#e5e2dc] bg-white hover:border-[#c9a96e]/50'
          }`}
        >
          <span className="absolute -top-2 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
            Save 3%
          </span>
          <p className="font-semibold">Cash or Venmo</p>
          <p className="text-xs text-[#6b6b6b]">No service fee &middot; credits apply after Chelsea confirms</p>
        </button>
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="max-w-md mx-auto rounded-2xl border border-red-200 bg-red-50 text-red-800 p-6 text-sm">
      {message}
    </div>
  );
}
