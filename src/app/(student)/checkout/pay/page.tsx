import { Suspense } from 'react';
import { CheckoutPayClient } from './client';
import { isPackSellable, areGiftsSellable } from '@/lib/purchases';
import { PurchasesClosedNotice } from '@/components/marketing/PurchasesClosedNotice';

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CheckoutPayPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Members reach this from bookmarks and old emails, so gate the page itself
  // — not just the buttons that used to link here. Gated per pack, since a
  // drop-in can be on sale while the multi-packs are not.
  const kind = first(searchParams.kind) ?? 'pack';
  const allowed =
    kind === 'pack'
      ? await isPackSellable(first(searchParams.pack))
      : await areGiftsSellable();

  if (!allowed) {
    return (
      <div className="bg-[#faf9f6] min-h-[calc(100vh-64px)]">
        <PurchasesClosedNotice variant="page" />
      </div>
    );
  }

  return (
    <div className="bg-[#faf9f6] min-h-[calc(100vh-64px)]">
      <main className="px-5 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-2">Checkout</p>
          <h1 className="text-3xl sm:text-4xl font-bold">Complete your purchase</h1>
          <p className="text-sm text-[#6b6b6b] mt-2">Secure payment &mdash; you&rsquo;ll be back on the schedule in a moment.</p>
        </div>
        <Suspense fallback={null}>
          <CheckoutPayClient />
        </Suspense>
      </main>
    </div>
  );
}
