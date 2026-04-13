'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const sessionId = searchParams.get('session_id');
  const pack = searchParams.get('pack');
  const [verifying, setVerifying] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  // Verify pack purchase and add credits on return from Stripe
  useEffect(() => {
    if ((type === 'pack' || pack) && sessionId) {
      setVerifying(true);
      fetch('/api/packs/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.credits_added) setCredits(data.credits_added);
          setVerifying(false);
        })
        .catch(() => setVerifying(false));
    }
  }, [type, pack, sessionId]);

  if (type === 'pack' || pack) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {verifying ? (
          <>
            <div className="text-4xl mb-4 animate-pulse">...</div>
            <h1 className="text-2xl font-bold mb-2">Confirming your purchase...</h1>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">&#10003;</div>
            <h1 className="text-2xl font-bold mb-2">Credits Added!</h1>
            <p className="text-muted-foreground mb-6">
              {credits ? `${credits} class ${credits === 1 ? 'credit' : 'credits'} added to your account.` : 'Your purchase has been confirmed.'}
            </p>
          </>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            Book a Class
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-12 px-8 rounded-lg border border-border font-medium hover:bg-muted"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (type === 'drop_in') {
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
      <div className="text-5xl mb-4">&#10003;</div>
      <h1 className="text-2xl font-bold mb-2">Success!</h1>
      <Link href="/dashboard" className="text-sm text-primary hover:underline mt-4">
        Go to Dashboard
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
