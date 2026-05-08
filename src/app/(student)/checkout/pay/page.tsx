import { Suspense } from 'react';
import { CheckoutPayClient } from './client';

export default function CheckoutPayPage() {
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
