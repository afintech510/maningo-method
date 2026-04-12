'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/Toast';
import { formatStudioDateTime } from '@/lib/timezone';
import { useRouter } from 'next/navigation';

interface Booking {
  id: string;
  class_id: string;
  class_title: string;
  class_starts_at: string;
  class_duration_minutes: number;
  status: string;
  payment_type: string;
}

interface UpcomingBookingsProps {
  bookings: Booking[];
}

export function UpcomingBookings({ bookings }: UpcomingBookingsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const cancelBooking = bookings.find((b) => b.id === cancelId);

  async function handleCancel() {
    if (!cancelId) return;
    setCancelling(true);

    try {
      const res = await fetch(`/api/bookings/${cancelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (res.ok) {
        showToast('Booking cancelled');
        setCancelId(null);
        router.refresh();
      } else {
        const data = await res.json();
        showToast(data.error?.message || 'Failed to cancel', 'error');
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setCancelling(false);
    }
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No upcoming classes"
        description="Browse the schedule to book your first class!"
        ctaLabel="View Schedule"
        ctaHref="/schedule"
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <p className="text-sm text-muted-foreground">
              {formatStudioDateTime(booking.class_starts_at)}
            </p>
            <p className="font-semibold">{booking.class_title}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-destructive"
              onClick={() => setCancelId(booking.id)}
            >
              Cancel
            </Button>
          </Card>
        ))}
      </div>

      <Modal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancel Booking"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Cancel your booking for {cancelBooking?.class_title}?
        </p>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleCancel}
            loading={cancelling}
          >
            Yes, Cancel
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setCancelId(null)}
          >
            Keep Booking
          </Button>
        </div>
      </Modal>
    </>
  );
}
