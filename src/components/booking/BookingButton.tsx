'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/feedback/Toast';

interface BookingButtonProps {
  classId: string;
  isFull: boolean;
  isBooked: boolean;
  isAuthenticated: boolean;
  hasCredits: boolean;
}

export function BookingButton({
  classId,
  isFull,
  isBooked,
  isAuthenticated,
  hasCredits,
}: BookingButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, setState] = useState<'default' | 'processing' | 'booked'>(
    isBooked ? 'booked' : 'default'
  );

  async function handleBook() {
    if (!isAuthenticated) {
      router.push('/login?return=/schedule');
      return;
    }

    if (!hasCredits) {
      router.push('/dashboard?buy=true');
      return;
    }

    setState('processing');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === 'WAIVER_REQUIRED') {
          router.push('/waiver/sign');
          return;
        }
        showToast(data.error?.message || 'Something went wrong', 'error');
        setState('default');
        return;
      }

      setState('booked');
      showToast('Booked! See you there.');
      router.refresh();
    } catch {
      showToast('Something went wrong. Try again.', 'error');
      setState('default');
    }
  }

  if (isFull) {
    return <Button variant="ghost" size="lg" className="w-full" disabled>Class Full</Button>;
  }

  if (state === 'booked' || isBooked) {
    return <Button variant="secondary" size="lg" className="w-full" disabled>Booked</Button>;
  }

  if (!isAuthenticated) {
    return (
      <Button variant="primary" size="lg" className="w-full" onClick={handleBook}>
        Log in to Book
      </Button>
    );
  }

  if (!hasCredits) {
    return (
      <Button variant="primary" size="lg" className="w-full" onClick={handleBook}>
        Buy Credits to Book
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full"
      loading={state === 'processing'}
      disabled={state === 'processing'}
      onClick={handleBook}
    >
      Book This Class
    </Button>
  );
}
