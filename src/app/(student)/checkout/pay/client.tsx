'use client';

import { useSearchParams } from 'next/navigation';
import { IntegratedCheckout, type CheckoutSummary } from '@/components/checkout/IntegratedCheckout';

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

  return <IntegratedCheckout kind="pack" pack={pack} summary={base} />;
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="max-w-md mx-auto rounded-2xl border border-red-200 bg-red-50 text-red-800 p-6 text-sm">
      {message}
    </div>
  );
}
