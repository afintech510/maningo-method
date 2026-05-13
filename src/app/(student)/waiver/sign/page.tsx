'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function WaiverSignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams?.get('status');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'complete') {
      const t = setTimeout(() => router.replace('/dashboard?waiver=signed'), 1500);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  async function handleStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/waiver/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Adult signer is the only supported path for now — the parent /
        // guardian flow is deferred. The API still accepts is_minor but we
        // always send false.
        body: JSON.stringify({ is_minor: false, minor_name: null, minor_dob: null }),
      });
      const data = await res.json();
      if (data.already_signed) {
        router.replace('/dashboard');
        return;
      }
      if (!res.ok) {
        setError(data?.error?.message || 'Could not start the waiver. Please try again.');
        setLoading(false);
        return;
      }
      // SignWell blocks iframe embedding for non-allowlisted domains; redirect
      // to their hosted signing page directly. They'll send the user back to
      // /waiver/sign?status=complete on completion via the redirect_url metadata.
      window.location.href = data.embedded_url;
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  if (status === 'complete') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold mb-2">Waiver received</h1>
          <p className="text-[#6b6b6b]">Taking you to your dashboard&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-10">
      <form onSubmit={handleStart} className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign Your Liability Waiver</h1>
          <p className="text-sm text-[#6b6b6b] mt-2">
            Required once before your first class. Takes about 2 minutes.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Continue to Sign
        </Button>

        <p className="text-xs text-[#6b6b6b] text-center">
          You&rsquo;ll be guided through the waiver in a secure window. After signing, your account is good
          to go for unlimited bookings.
        </p>
      </form>
    </div>
  );
}
