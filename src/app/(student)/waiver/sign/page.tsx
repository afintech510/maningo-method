'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function WaiverSignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams?.get('status');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinor, setIsMinor] = useState(false);
  const [minorName, setMinorName] = useState('');
  const [minorDob, setMinorDob] = useState('');

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
        body: JSON.stringify({
          is_minor: isMinor,
          minor_name: isMinor ? minorName : null,
          minor_dob: isMinor ? minorDob : null,
        }),
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

        <div className="rounded-2xl border border-[#e5e2dc] bg-white p-5">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isMinor}
              onChange={(e) => setIsMinor(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#e5e2dc] text-[#c9a96e] focus:ring-[#c9a96e]"
            />
            <span className="text-[#2d2d2d]">
              The participant is under 18. I am the parent or legal guardian and will sign on their behalf.
            </span>
          </label>

          {isMinor && (
            <div className="mt-4 space-y-3">
              <Input
                label="Minor's Full Name"
                value={minorName}
                onChange={(e) => setMinorName(e.target.value)}
                required
                placeholder="Child's full name"
              />
              <Input
                label="Minor's Date of Birth"
                type="date"
                value={minorDob}
                onChange={(e) => setMinorDob(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <Button type="submit" loading={loading} className="w-full">
          {isMinor ? 'Continue to Sign as Parent/Guardian' : 'Continue to Sign'}
        </Button>

        <p className="text-xs text-[#6b6b6b] text-center">
          You&rsquo;ll be guided through the waiver in a secure window. After signing, your account is good
          to go for unlimited bookings.
        </p>
      </form>
    </div>
  );
}
