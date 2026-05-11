'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/feedback/Toast';
import { formatStudioDate, formatStudioDateTime } from '@/lib/timezone';

interface BookingButtonProps {
  classId: string;
  isFull: boolean;
  isBooked: boolean;
  isAuthenticated: boolean;
  hasCredits: boolean;
  /** Available credit balance (when known) — surfaced in the confirm modal. */
  credits?: number;
  /** Booking id when isBooked=true — required to cancel. */
  bookingId?: string;
  /** When provided, surfaces class details inside the confirmation modal. */
  classTitle?: string;
  classStartsAt?: string;
  classDurationMinutes?: number;
  classSpotsRemaining?: number;
  /** True when the class is within the studio's booking-horizon window. */
  bookable?: boolean;
  /** ISO date when bookings open for this class. */
  bookableFrom?: string;
}

export function BookingButton({
  classId,
  isFull,
  isBooked,
  isAuthenticated,
  hasCredits,
  credits,
  bookingId,
  classTitle,
  classStartsAt,
  classDurationMinutes,
  classSpotsRemaining,
  bookable = true,
  bookableFrom,
}: BookingButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, setState] = useState<'default' | 'processing' | 'booked'>(
    isBooked ? 'booked' : 'default'
  );
  const [confirming, setConfirming] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  async function handleCancelConfirm() {
    if (!bookingId) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Close the dialog so the error sits in plain view at the top of
        // the card, not behind the modal.
        setCancelOpen(false);
        setCancelling(false);
        setCancelError(data.error?.message || 'Could not cancel.');
        return;
      }
      showToast('Booking cancelled. Credit refunded.');
      setCancelOpen(false);
      setCancelling(false);
      router.refresh();
    } catch {
      setCancelOpen(false);
      setCancelling(false);
      setCancelError('Something went wrong. Try again.');
    }
  }

  if (isFull && !isBooked) {
    return <Button variant="ghost" size="lg" className="w-full" disabled>Class Full</Button>;
  }
  if (!bookable && !isBooked) {
    const opensLabel = bookableFrom ? formatStudioDate(bookableFrom, 'EEE, MMM d') : 'soon';
    return (
      <Button variant="ghost" size="lg" className="w-full" disabled>
        Books open {opensLabel}
      </Button>
    );
  }
  if (state === 'booked' || isBooked) {
    if (!bookingId) {
      return <Button variant="secondary" size="lg" className="w-full" disabled>Booked</Button>;
    }
    return (
      <>
        {cancelError && (
          <div role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 p-3 flex items-start justify-between gap-3">
            <p className="text-sm text-red-800">{cancelError}</p>
            <button
              type="button"
              onClick={() => setCancelError(null)}
              aria-label="Dismiss"
              className="text-red-700 hover:text-red-900 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" disabled>Booked</Button>
          <Button variant="ghost" size="lg" className="text-destructive" onClick={() => setCancelOpen(true)}>
            Cancel
          </Button>
        </div>
        <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel booking?">
          <div className="rounded-xl bg-[#faf9f6] border border-border p-4 mb-4">
            {classTitle && <p className="font-semibold">{classTitle}</p>}
            {classStartsAt && (
              <p className="text-sm text-muted-foreground mt-1">{formatStudioDateTime(classStartsAt)}</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            We&rsquo;ll refund <strong className="text-foreground">1 class credit</strong> back to your account.
            Cancellations within 12 hours of class start aren&rsquo;t self-service &mdash; contact Chelsea directly.
          </p>
          <div className="flex gap-3">
            <Button variant="destructive" className="flex-1" onClick={handleCancelConfirm} loading={cancelling}>
              Yes, cancel booking
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
          </div>
        </Modal>
      </>
    );
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

        {typeof credits === 'number' && (
          <div className="flex items-center justify-between rounded-lg bg-[#faf9f6] border border-border px-3 py-2 mb-3 text-sm">
            <span className="text-muted-foreground">Available credits</span>
            <span className="font-semibold">{credits}</span>
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-4">
          This will use <strong className="text-foreground">1 class credit</strong> from your balance.
          {typeof credits === 'number' && credits > 0 && (
            <> Balance after: <strong className="text-foreground">{credits - 1}</strong>.</>
          )}
          {' '}You can cancel up to 12 hours before class start for a full credit refund.
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
