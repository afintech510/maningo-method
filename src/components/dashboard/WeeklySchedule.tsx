'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/Toast';
import { formatStudioTime, formatStudioDate, formatStudioDateTime } from '@/lib/timezone';
import { addDays, format } from 'date-fns';

interface ClassItem {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  spots_remaining: number;
  max_capacity: number;
}

interface WeeklyScheduleProps {
  bookedClassIds: string[];
  hasCredits: boolean;
}

export function WeeklySchedule({ bookedClassIds, hasCredits }: WeeklyScheduleProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClass, setConfirmClass] = useState<ClassItem | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const now = new Date();
    const horizonEnd = addDays(now, 28); // 4-week look-ahead
    horizonEnd.setHours(23, 59, 59, 999);

    fetch(`/api/classes?from=${now.toISOString()}&to=${horizonEnd.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        // Belt + suspenders: filter past classes client-side too
        const upcoming = (data.classes || []).filter((c: ClassItem) => new Date(c.starts_at) >= now);
        setClasses(upcoming);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleBook() {
    if (!confirmClass) return;
    setBooking(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: confirmClass.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === 'WAIVER_REQUIRED') {
          router.push('/waiver/sign');
          return;
        }
        showToast(data.error?.message || 'Something went wrong', 'error');
      } else {
        showToast(`Booked! ${confirmClass.title} confirmed.`);
        router.refresh();
      }
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setBooking(false);
      setConfirmClass(null);
    }
  }

  if (loading) return <Skeleton variant="card" />;

  // Group by day
  const grouped: Record<string, ClassItem[]> = {};
  classes.forEach((cls) => {
    const day = format(new Date(cls.starts_at), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(cls);
  });

  const days = Object.keys(grouped).sort();

  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No upcoming classes scheduled.</p>;
  }

  return (
    <>
      <div className="space-y-4">
        {days.map((day) => (
          <div key={day}>
            <p className="text-sm font-semibold text-muted-foreground mb-2">
              {formatStudioDate(day, 'EEEE, MMM d')}
            </p>
            <div className="space-y-2">
              {grouped[day].map((cls) => {
                const isBooked = bookedClassIds.includes(cls.id);
                const isFull = cls.spots_remaining <= 0;

                return (
                  <Card key={cls.id} className="py-3 px-4">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{cls.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatStudioTime(cls.starts_at)} &middot; {cls.duration_minutes} min &middot;{' '}
                          <span className={cls.spots_remaining <= 3 ? 'text-amber-600' : 'text-green-600'}>
                            {cls.spots_remaining} spots
                          </span>
                        </p>
                      </div>
                      {isBooked ? (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
                          Booked
                        </span>
                      ) : isFull ? (
                        <span className="text-xs text-muted-foreground flex-shrink-0">Full</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          className="flex-shrink-0 h-8 px-4 text-xs rounded-full"
                          onClick={() => setConfirmClass(cls)}
                        >
                          Book
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Booking Confirmation Modal */}
      <Modal
        open={!!confirmClass}
        onClose={() => setConfirmClass(null)}
        title="Confirm Booking"
      >
        {confirmClass && (
          <>
            <div className="rounded-xl bg-[#faf9f6] border border-border p-4 mb-4">
              <p className="font-semibold text-lg">{confirmClass.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatStudioDateTime(confirmClass.starts_at)}
              </p>
              <p className="text-sm text-muted-foreground">
                {confirmClass.duration_minutes} min &middot; {confirmClass.spots_remaining} spots left
              </p>
              <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Maningo Method &middot; 295 Montauk Hwy, Speonk</span>
              </div>
            </div>

            {!hasCredits && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mb-4">
                You don&apos;t have any class credits. This booking will use 1 credit.
              </p>
            )}

            <p className="text-sm text-muted-foreground mb-4">
              This will use 1 class credit from your balance.
            </p>

            <div className="flex gap-3">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleBook}
                loading={booking}
              >
                Confirm Booking
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmClass(null)}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
