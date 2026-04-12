'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/feedback/Toast';

type BookingState = 'default' | 'processing' | 'booked' | 'full' | 'pending' | 'login';

interface BookingButtonProps {
  classId: string;
  isFull: boolean;
  isBooked: boolean;
  isPending: boolean;
  hasSubscription: boolean;
  isAuthenticated: boolean;
}

export function BookingButton({
  classId,
  isFull,
  isBooked,
  isPending,
  hasSubscription,
  isAuthenticated,
}: BookingButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, setState] = useState<BookingState>(
    !isAuthenticated ? 'login' :
    isBooked ? 'booked' :
    isPending ? 'pending' :
    isFull ? 'full' : 'default'
  );

  async function handleBook() {
    if (!isAuthenticated) {
      router.push(`/login?return=/schedule`);
      return;
    }

    setState('processing');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          payment_type: hasSubscription ? 'subscription' : 'drop_in',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error?.message || 'Something went wrong', 'error');
        setState('default');
        return;
      }

      if (hasSubscription) {
        setState('booked');
        showToast('Booked! See you there.');
        router.refresh();
      } else {
        // Drop-in: redirect to checkout (placeholder for now)
        setState('pending');
        if (data.checkout_url) {
          router.push(data.checkout_url);
        }
      }
    } catch {
      showToast('Something went wrong. Try again.', 'error');
      setState('default');
    }
  }

  const buttonConfig: Record<BookingState, { label: string; variant: 'primary' | 'secondary' | 'ghost'; disabled: boolean }> = {
    default: { label: 'Book This Class', variant: 'primary', disabled: false },
    processing: { label: 'Booking...', variant: 'primary', disabled: true },
    booked: { label: 'Booked', variant: 'secondary', disabled: true },
    full: { label: 'Class Full', variant: 'ghost', disabled: true },
    pending: { label: 'Completing payment...', variant: 'secondary', disabled: true },
    login: { label: 'Log in to Book', variant: 'primary', disabled: false },
  };

  const config = buttonConfig[state];

  return (
    <Button
      variant={config.variant}
      size="lg"
      className="w-full"
      disabled={config.disabled}
      loading={state === 'processing'}
      onClick={handleBook}
    >
      {config.label}
    </Button>
  );
}
