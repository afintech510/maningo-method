'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/feedback/Toast';
import { formatStudioDateTime } from '@/lib/timezone';

interface BookingButtonProps {
  classId: string;
  isFull: boolean;
  isBooked: boolean;
  isAuthenticated: boolean;
  hasCredits: boolean;
  /** When provided, surfaces class details inside the confirmation modal. */
  classTitle?: string;
  classStartsAt?: string;
  classDurationMinutes?: number;
  classSpotsRemaining?: number;
}

export function BookingButton({
  classId,
  isFull,
  isBooked,
  isAuthenticated,
  hasCredits,
  classTitle,
  classStartsAt,
  classDurationMinutes,
  classSpotsRemaining,
}: BookingButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, setState] = useState<'default' | 'processing' | 'booked'>(
    isBooked ? 'booked' : 'default'
  );
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!isAuthenticated) {
      router.push('/login?return=/schedule');
      return;
    }
    if (!hasCredits) {
      router.push('/dashboard?buy=true');
      return;
    }
    // Open confirmation modal — credit is only burned on confirm.
    setConfirming(true);
  }

  async function handleConfirm() {
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
          setConfirming(false);
          router.push('/waiver/sign');
          return;
        }
        showToast(data.error?.message || 'Something went wrong', 'error');
        setState('default');
        return;
      }

      setState('booked');
      showToast('Booked! See you there.');
      setConfirming(false);
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
      <Button variant="primary" size="lg" className="w-full" onClick={handleClick}>
        Log in to Book
      </Button>
    );
  }
  if (!hasCredits) {
    return (
      <Button variant="primary" size="lg" className="w-full" onClick={handleClick}>
        Buy Credits to Book
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={state === 'processing'}
        disabled={state === 'processing'}
        onClick={handleClick}
      >
        Book This Class
      </Button>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Confirm Booking">
        <div className="rounded-xl bg-[#faf9f6] border border-border p-4 mb-4">
          {classTitle && <p className="font-semibold text-lg">{classTitle}</p>}
          {classStartsAt && (
            <p className="text-sm text-muted-foreground mt-1">
              {formatStudioDateTime(classStartsAt)}
            </p>
          )}
          {(classDurationMinutes || typeof classSpotsRemaining === 'number') && (
            <p className="text-sm text-muted-foreground">
              {classDurationMinutes ? `${classDurationMinutes} min` : ''}
              {classDurationMinutes && typeof classSpotsRemaining === 'number' ? ' · ' : ''}
              {typeof classSpotsRemaining === 'number'
                ? `${classSpotsRemaining} spot${classSpotsRemaining === 1 ? '' : 's'} left`
                : ''}
            </p>
          )}
          <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground">
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Maningo Method · 295 Montauk Hwy, Speonk</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          This will use <strong className="text-foreground">1 class credit</strong> from your balance.
          You can cancel up to 12 hours before class start for a full credit refund.
        </p>

        <div className="flex gap-3">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleConfirm}
            loading={state === 'processing'}
          >
            Confirm Booking
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
