'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const pending = searchParams.get('pending');

  if (type === 'subscription') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">&#10003;</div>
        <h1 className="text-2xl font-bold mb-2">Welcome to Maningo Method!</h1>
        <p className="text-muted-foreground mb-6">
          Your unlimited membership is active. Book as many classes as you want.
        </p>
        <Link
          href="/schedule"
          className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
        >
          Browse Schedule
        </Link>
      </div>
    );
  }

  if (type === 'drop_in' || pending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">&#10003;</div>
        <h1 className="text-2xl font-bold mb-2">You&apos;re Booked!</h1>
        <p className="text-muted-foreground mb-6">
          Your spot is confirmed. See you at the studio!
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
        >
          View My Classes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Booking Complete</h1>
      <Link href="/schedule" className="text-sm text-primary hover:underline mt-4">
        Back to Schedule
      </Link>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BookingSuccessContent />
    </Suspense>
  );
}
