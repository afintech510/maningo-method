'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/feedback/Toast';
import { formatStudioDate, formatStudioDateTime } from '@/lib/timezone';
import { CapacityBadge } from '@/components/ui/CapacityBadge';

interface BookingButtonProps {
  classId: string;
  isFull: boolean;
  isBooked: boolean;
  isAuthenticated: boolean;
  hasCredits: boolean;
  /** Free class — bypasses the credit gate/debit; books with a suggested donation. */
  isFree?: boolean;
  /** Location shown in the confirm modal for free classes (from class description). */
  location?: string;
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
  /** Active waitlist entry for this class, if any. */
  waitlistEntry?: { id: string; position: number };
  /** Path to return to after login (deep-link back to a class page). */
  returnTo?: string;
}

export function BookingButton({
  classId,
  isFull,
  isBooked,
  isAuthenticated,
  hasCredits,
  isFree = false,
  location,
  credits,
  bookingId,
  classTitle,
  classStartsAt,
  classDurationMinutes,
  classSpotsRemaining,
  bookable = true,
  bookableFrom,
  waitlistEntry,
  returnTo = '/schedule',
}: BookingButtonProps) {
  const router = useRouter();
  const loginHref = `/login?next=${encodeURIComponent(returnTo)}`;
  const { showToast } = useToast();
  const [state, setState] = useState<'default' | 'processing' | 'booked'>(
    isBooked ? 'booked' : 'default'
  );
  const [confirming, setConfirming] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [waitlistProcessing, setWaitlistProcessing] = useState(false);

  function handleClick() {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    // Free classes skip the credit gate — any logged-in member can book.
    if (!isFree && !hasCredits) {
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
      showToast(
        data?.credit_refunded === false
          ? 'Booking cancelled. Your spot has been released.'
          : 'Booking cancelled. Credit refunded.'
      );
      setCancelOpen(false);
      setCancelling(false);
      router.refresh();
    } catch {
      setCancelOpen(false);
      setCancelling(false);
      setCancelError('Something went wrong. Try again.');
    }
  }

  async function handleJoinWaitlist() {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    // Free classes skip the credit gate on the waitlist too.
    if (!isFree && !hasCredits) {
      router.push('/dashboard?buy=true');
      return;
    }
    setWaitlistProcessing(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error?.message || 'Something went wrong', 'error');
      } else {
        showToast(`You're #${data.waitlist?.position || 1} on the waitlist.`);
        router.refresh();
      }
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setWaitlistProcessing(false);
    }
  }

  async function handleLeaveWaitlist() {
    if (!waitlistEntry) return;
    setWaitlistProcessing(true);
    try {
      const res = await fetch(`/api/waitlist/${waitlistEntry.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error?.message || 'Something went wrong', 'error');
      } else {
        showToast('You left the waitlist.');
        router.refresh();
      }
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setWaitlistProcessing(false);
    }
  }

  if (isFull && !isBooked) {
    if (waitlistEntry) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" disabled>
            Waitlist #{waitlistEntry.position}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="text-destructive"
            onClick={handleLeaveWaitlist}
            loading={waitlistProcessing}
          >
            Leave
          </Button>
        </div>
      );
    }
    if (!isAuthenticated) {
      return (
        <Button variant="primary" size="lg" className="w-full" onClick={() => router.push(loginHref)}>
          Log in to Join Waitlist
        </Button>
      );
    }
    if (!isFree && !hasCredits) {
      return (
        <Button variant="primary" size="lg" className="w-full" onClick={() => router.push('/dashboard?buy=true')}>
          Get a Credit to Join Waitlist
        </Button>
      );
    }
    return (
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleJoinWaitlist}
        loading={waitlistProcessing}
      >
        Join Waitlist
      </Button>
    );
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
            {isFree ? (
              <>Your spot will be released so someone else can grab it. No credit was used, so there&rsquo;s nothing to refund.</>
            ) : (
              <>We&rsquo;ll refund <strong className="text-foreground">1 class credit</strong> back to your account.
              Cancellations within 12 hours of class start aren&rsquo;t self-service &mdash; contact Chelsea directly.</>
            )}
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
  if (!isFree && !hasCredits) {
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
          {classDurationMinutes ? (
            <p className="text-sm text-muted-foreground">{classDurationMinutes} min</p>
          ) : null}
          {typeof classSpotsRemaining === 'number' && (
            <div className="mt-2">
              <CapacityBadge
                bookedCount={20 - classSpotsRemaining}
                capacity={20}
              />
            </div>
          )}
          <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground">
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{isFree ? (location || 'Location details in the class description') : 'Maningo Method · 295 Montauk Hwy, Speonk'}</span>
          </div>
        </div>

        {!isFree && typeof credits === 'number' && (
          <div className="flex items-center justify-between rounded-lg bg-[#faf9f6] border border-border px-3 py-2 mb-3 text-sm">
            <span className="text-muted-foreground">Available credits</span>
            <span className="font-semibold">{credits}</span>
          </div>
        )}

        {isFree ? (
          <p className="text-sm text-muted-foreground mb-4">
            <strong className="text-foreground">Free to book — no credit used.</strong>{' '}
            Suggested <strong className="text-foreground">$20 cash donation</strong> on-site, 100% to{' '}
            <a href="https://t2t.org/" target="_blank" rel="noopener noreferrer" className="text-[#c9a96e] hover:underline">
              Tunnel to Towers (t2t.org)
            </a>.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">
            This will use <strong className="text-foreground">1 class credit</strong> from your balance.
            {typeof credits === 'number' && credits > 0 && (
              <> Balance after: <strong className="text-foreground">{credits - 1}</strong>.</>
            )}
            {' '}You can cancel any time before class for a full credit refund.
          </p>
        )}

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
