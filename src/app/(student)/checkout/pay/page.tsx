import { Suspense } from 'react';
import Link from 'next/link';
import { CheckoutPayClient } from './client';

export default function CheckoutPayPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="bg-white border-b border-[#e5e2dc]">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-serif font-bold tracking-tight">
            Maningo Method
          </Link>
          <Link href="/dashboard" className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a]">
            Cancel
          </Link>
        </div>
      </header>
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
